import Tesseract from 'tesseract.js';
import {
  validateImageFile,
  readFileAsDataUrl,
  preprocessReceiptImage,
  PreprocessedImageResult,
} from './imagePreprocessing';
import { parseBillText, ParsedBillData } from './parseBillText';

export interface ScanBillResult {
  merchant: string;
  amount: number; // in Rupees
  date: string; // YYYY-MM-DD
  rawText: string;
  originalImage: string; // data URL for storage
  confidence: 'high' | 'medium' | 'low';
}

export type ScanProgressCallback = (stage: string, percent?: number) => void;

/**
 * Executes the complete OCR & bill extraction pipeline.
 * Follows exact logging guidelines:
 * [Scanner] Image selected
 * [Scanner] Image loaded
 * [Scanner] OCR started
 * [Scanner] OCR completed
 * [Scanner] OCR text length: XXX
 * [Scanner] Amount detected: ₹XXXX
 * [Scanner] Merchant detected: XXXXX
 * [Scanner] Scanner result ready
 */
let tesseractWorkerPromise: Promise<any> | null = null;

/**
 * Pre-warms the Tesseract worker in background to eliminate first-scan delays.
 */
export function preloadOcrWorker() {
  if (typeof window === 'undefined') return;
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = Tesseract.createWorker('eng').catch((err) => {
      console.warn('[Scanner] Preload worker error:', err);
      tesseractWorkerPromise = null;
    });
  }
}

// Automatically trigger worker warmup on load
if (typeof window !== 'undefined') {
  setTimeout(() => preloadOcrWorker(), 1500);
}

export async function runBillOCR(
  input: File | Blob | string,
  onProgress?: ScanProgressCallback
): Promise<ScanBillResult> {
  try {
    console.log('[Scanner] Image selected');
    onProgress?.('Preparing image...', 10);

    // 1. Get raw Data URL
    let rawDataUrl: string;
    if (typeof input === 'string') {
      rawDataUrl = input;
    } else {
      const validation = validateImageFile(input as File);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid image file.');
      }
      rawDataUrl = await readFileAsDataUrl(input);
    }

    console.log('[Scanner] Image loaded');
    onProgress?.('Optimizing image for reading...', 20);

    // 2. Preprocess image (scaling, grayscale, contrast filter)
    const preprocessed: PreprocessedImageResult = await preprocessReceiptImage(rawDataUrl);

    console.log('[Scanner] OCR started');
    onProgress?.('Initializing OCR engine...', 35);

    let rawOcrText = '';

    // 3. Run OCR (Tesseract client-side with generous 45s cold-start timeout)
    try {
      const tesseractPromise = (async () => {
        // Use recognize directly which downloads/caches language models smoothly
        const res = await Tesseract.recognize(
          preprocessed.processedDataUrl,
          'eng',
          {
            logger: (m) => {
              if (m.status === 'loading tesseract core') {
                onProgress?.('Loading OCR engine...', 40);
              } else if (m.status === 'loading language traineddata') {
                onProgress?.('Loading language models...', 55);
              } else if (m.status === 'recognizing text') {
                const progressPct = Math.round(60 + (m.progress || 0) * 35);
                onProgress?.('Reading receipt text & amount...', Math.min(progressPct, 95));
              }
            },
          }
        );
        return res.data?.text || '';
      })();

      // 45s timeout for cold start downloads on slow networks
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('OCR processing timed out. Please try again.')), 45000)
      );

      rawOcrText = await Promise.race([tesseractPromise, timeoutPromise]);
    } catch (ocrErr: any) {
      console.warn('[Scanner] Local OCR warning/fallback:', ocrErr?.message);
    }

    console.log('[Scanner] OCR completed');
    console.log('[Scanner] OCR text length:', rawOcrText.length);

    // 4. Parse text using our domain parser
    let parsed = parseBillText(rawOcrText);

    // If initial pass didn't find an amount and raw text length was small, attempt fallback pass on original image
    if (parsed.amount <= 0 && preprocessed.originalDataUrl !== preprocessed.processedDataUrl) {
      try {
        console.log('[Scanner] Attempting secondary pass on original image...');
        const secondaryRes = await Tesseract.recognize(preprocessed.originalDataUrl, 'eng');
        const secondaryText = secondaryRes.data?.text || '';
        if (secondaryText.length > 0) {
          const secondaryParsed = parseBillText(secondaryText);
          if (secondaryParsed.amount > 0) {
            parsed = secondaryParsed;
            rawOcrText = `${rawOcrText}\n${secondaryText}`;
          }
        }
      } catch {
        // Ignore secondary pass errors
      }
    }

    console.log(`[Scanner] Amount detected: ₹${parsed.amount}`);
    console.log(`[Scanner] Merchant detected: ${parsed.merchant}`);
    console.log('[Scanner] Scanner result ready');

    onProgress?.('Bill scanned successfully', 100);

    return {
      merchant: parsed.merchant,
      amount: parsed.amount,
      date: parsed.date,
      rawText: parsed.rawText || rawOcrText,
      originalImage: preprocessed.processedDataUrl || preprocessed.originalDataUrl,
      confidence: parsed.confidence,
    };
  } catch (err: any) {
    console.error('[Scanner Error]', err?.message || err);
    throw new Error(err?.message || 'Could not complete bill scan.');
  }
}
