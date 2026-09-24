/**
 * Image preprocessing utilities for Bill Scanner.
 * Validates formats, normalizes size, and enhances contrast for OCR readability.
 */

export interface PreprocessedImageResult {
  originalDataUrl: string;
  processedDataUrl: string;
  width: number;
  height: number;
}

const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/heic',
  'image/heif',
];

const MAX_IMAGE_DIMENSION = 2200;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const mime = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  const isSupported =
    SUPPORTED_MIME_TYPES.includes(mime) ||
    ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extension);

  if (!isSupported) {
    return {
      valid: false,
      error: `Unsupported file format (${mime || extension}). Please upload a JPEG, PNG, or WebP image.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds 20MB. Please use a smaller photo.',
    };
  }

  return { valid: true };
}

/**
 * Reads a File or Blob into a base64 Data URL.
 */
export function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Preprocesses an image via Canvas:
 * 1. Resizes down if exceeds MAX_IMAGE_DIMENSION to keep OCR fast and reliable.
 * 2. Applies subtle contrast enhancement to make faded thermal receipt text pop.
 */
export async function preprocessReceiptImage(
  dataUrl: string
): Promise<PreprocessedImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down if dimensions are excessively large
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
          height = MAX_IMAGE_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        return resolve({
          originalDataUrl: dataUrl,
          processedDataUrl: dataUrl,
          width,
          height,
        });
      }

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Contrast enhancement filter for OCR readability
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        // Contrast adjustment factor
        const contrast = 1.2;
        const intercept = 128 * (1 - contrast);

        for (let i = 0; i < data.length; i += 4) {
          // Grayscale luminosity
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;

          // Apply contrast
          let adjusted = gray * contrast + intercept;
          adjusted = Math.min(255, Math.max(0, adjusted));

          data[i] = adjusted;
          data[i + 1] = adjusted;
          data[i + 2] = adjusted;
        }

        ctx.putImageData(imageData, 0, 0);
        const processedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

        resolve({
          originalDataUrl: dataUrl,
          processedDataUrl,
          width,
          height,
        });
      } catch {
        // Fallback to original if pixel manipulation blocked
        resolve({
          originalDataUrl: dataUrl,
          processedDataUrl: dataUrl,
          width,
          height,
        });
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for preprocessing.'));
    };

    img.src = dataUrl;
  });
}
