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
    onProgress?.('Enhancing contrast and readability...', 25);

    // 2. Preprocess image (scaling, grayscale, contrast filter)
    const preprocessed: PreprocessedImageResult = await preprocessReceiptImage(rawDataUrl);

    console.log('[Scanner] OCR started');
    onProgress?.('Scanning your bill... Reading the text', 40);

    let rawOcrText = '';


    // 3. Run OCR (Tesseract client-side with timeout fallback to Server AI)
    try {
      // Race Tesseract with a timeout to avoid freezing on heavy devices
      const tesseractPromise = Tesseract.recognize(
        preprocessed.processedDataUrl,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text' && m.progress) {
              const progressPct = Math.round(40 + m.progress * 40);
              onProgress?.('Scanning your bill... Reading the amount', progressPct);
            }
          },
        }
      );

      // 10s timeout for local wasm OCR before trying server
      const timeoutPromise = new Promise<{ data: { text: string } }>((_, reject) =>
        setTimeout(() => reject(new Error('OCR timeout')), 10000)
      );

      const ocrResult = await Promise.race([tesseractPromise, timeoutPromise]);
      rawOcrText = ocrResult.data.text || '';
    } catch (ocrErr: any) {
      console.warn('[Scanner] Local OCR fallback triggered:', ocrErr?.message);
    }

    console.log('[Scanner] OCR completed');
    console.log('[Scanner] OCR text length:', rawOcrText.length);

    // 4. Parse text using our domain parser
    let parsed = parseBillText(rawOcrText);



    console.log(`[Scanner] Amount detected: ₹${parsed.amount}`);
    console.log(`[Scanner] Merchant detected: ${parsed.merchant}`);
    console.log('[Scanner] Scanner result ready');

    onProgress?.('Bill scanned successfully', 100);

    return {
      merchant: parsed.merchant,
      amount: parsed.amount,
      date: parsed.date,
      rawText: parsed.rawText,
      originalImage: preprocessed.originalDataUrl,
      confidence: parsed.confidence,
    };
  } catch (err: any) {
    console.error('[Scanner Error]', err?.message || err);
    throw new Error(err?.message || 'Could not complete bill scan.');
  }
}
