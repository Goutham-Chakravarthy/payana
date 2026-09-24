/**
 * Intelligent Bill & Receipt Text Parser
 * Accurately extracts Amount, Merchant, Date, and RawText from OCR output.
 */

export interface ParsedBillData {
  merchant: string;
  amount: number; // in Rupees
  date: string; // YYYY-MM-DD
  rawText: string;
  confidence: 'high' | 'medium' | 'low';
}

// Keywords prioritized for final bill payable amount
const TOTAL_AMOUNT_PATTERNS = [
  // Fuel & Retail Total Amount / Amount Paid (e.g. Nayara, HP, Shell, Indian Oil, Bharat Petroleum)
  /(?:total\s*amount|amount\s*paid|net\s*amount\s*paid|bill\s*amount)[\s\S]{0,35}?[₹\s]*(?:rs\.?|inr)?[\s]*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:grand\s*total|net\s*payable|amount\s*payable|final\s*total|bill\s*total|net\s*amount|total\s*bill)[\s\S]{0,35}?[₹\s]*(?:rs\.?|inr)?[\s]*([\d,]+(?:\.\d{1,2})?)/i,
  
  // UPI & App patterns (PhonePe, GPay, Paytm, CRED)
  /(?:paid\s*to|paying|sent\s*to|transfer\s*to|payment\s*to)[\s\S]{1,40}?[₹\s]*(?:rs\.?|inr)?[\s]*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:payment\s*of|paid|debited)[\s]*[₹\s]*(?:rs\.?|inr)?[\s]*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:amount\s*paid|txn\s*amount|transaction\s*amount)[\s:=_-]*[₹\s]*(?:rs\.?|inr)?[\s]*([\d,]+(?:\.\d{1,2})?)/i,
  
  // Explicit Total rows
  /(?:total\s*due|balance\s*due|total\s*food|total\s*charge)[\s:=_-]*[₹\s]*(?:rs\.?|inr)?[\s]*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:^|\n)\s*total[\s:=_\-\(₹\)]+([0-9,]+(?:\.\d{1,2})?)/i,
  /[₹\s]*(?:rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:total|payable|only|\/-)/i,
];

// Patterns that must NOT be confused with bill amount
const PHONE_PATTERN = /\b[6-9]\d{9}\b/;
const GSTIN_PATTERN = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/;
const PINCODE_PATTERN = /\b[1-9]\d{5}\b/;
const TIME_PATTERN = /\b\d{1,2}:\d{2}(?::\d{2})?\b/;

// Generic headers to ignore when detecting merchant
const GENERIC_HEADER_WORDS = [
  'tax invoice',
  'retail invoice',
  'cash receipt',
  'bill',
  'receipt',
  'cash memo',
  'estimate',
  'guest check',
  'order number',
  'order #',
  'welcome',
  'thank you',
  'table no',
  'token no',
  'gst in',
  'gstin',
  'payment successful',
  'transaction successful',
  'completed',
  'banking name',
  'upi transaction id',
  'google pay',
  'phonepe',
  'paytm',
  'sample - not a valid receipt',
  'not a valid receipt',
];

/**
 * Parses raw OCR text into structured bill information.
 */
export function parseBillText(rawText: string): ParsedBillData {
  const trimmed = rawText.trim();
  const lines = trimmed
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let detectedAmount = 0;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // 1. First priority: Check written words (e.g. "Rupees Two Thousand Only")
  const wordAmount = parseRupeesInWords(trimmed);
  if (wordAmount > 0) {
    detectedAmount = wordAmount;
    confidence = 'high';
  }

  // 2. High-priority explicit total patterns
  if (detectedAmount === 0) {
    for (const pattern of TOTAL_AMOUNT_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const cleanNumStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(cleanNumStr);
        if (isValidBillAmount(parsed, match[0])) {
          detectedAmount = parsed;
          confidence = 'high';
          break;
        }
      }
    }
  }

  // 3. Scan line-by-line looking for Total / Amount Paid rows
  if (detectedAmount === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();

      // Specifically check for final total keywords, IGNORE column headers like "product qty rate amount"
      const isHeaderRow = line.includes('qty') && (line.includes('rate') || line.includes('product'));
      if (isHeaderRow) continue;

      const isTotalLine =
        line.includes('total amount') ||
        line.includes('amount paid') ||
        line.includes('grand total') ||
        line.includes('net payable') ||
        line.includes('net amount') ||
        line.includes('bill total') ||
        line.includes('total fare') ||
        line.includes('paid to') ||
        line.includes('payment of') ||
        (line.startsWith('total') && !line.includes('tax') && !line.includes('sub'));

      if (isTotalLine) {
        // Extract numbers from this line
        const numbers = extractNumbersFromLine(lines[i]);
        if (numbers.length > 0) {
          detectedAmount = numbers[numbers.length - 1]; // right-most number on the total row
          confidence = 'high';
          break;
        }

        // Or look at the very next line if numbers wrap
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].toLowerCase();
          if (!nextLine.includes('tax') && !nextLine.includes('cgst') && !nextLine.includes('sgst')) {
            const nextNumbers = extractNumbersFromLine(lines[i + 1]);
            if (nextNumbers.length > 0) {
              detectedAmount = nextNumbers[nextNumbers.length - 1]; // pick the total amount, not the quantity
              confidence = 'medium';
              break;
            }
          }
        }
      }
    }
  }

  // 4. Check currency symbol lines (₹ or Rs.) - take the rightmost valid amount
  if (detectedAmount === 0) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const lower = line.toLowerCase();
      // Skip tax breakdown lines
      if (lower.includes('cgst') || lower.includes('sgst') || lower.includes('igst') || lower.includes('tax amount')) {
        continue;
      }
      if (/[₹]|(?:\brs\.?\b)|(?:\binr\b)/i.test(line)) {
        const numbers = extractNumbersFromLine(line);
        if (numbers.length > 0) {
          const valid = numbers.filter((n) => isValidBillAmount(n, line));
          if (valid.length > 0) {
            detectedAmount = valid[valid.length - 1];
            confidence = 'medium';
            break;
          }
        }
      }
    }
  }

  // 5. Fallback: Search for the highest reasonable monetary amount on the bill
  if (detectedAmount === 0) {
    const candidateAmounts: number[] = [];
    for (const line of lines) {
      const lower = line.toLowerCase();
      // Skip header rows and tax breakdown rows
      if (lower.includes('qty') || lower.includes('cgst') || lower.includes('sgst')) continue;

      const numbers = extractNumbersFromLine(line);
      for (const num of numbers) {
        if (isValidBillAmount(num, line)) {
          candidateAmounts.push(num);
        }
      }
    }

    if (candidateAmounts.length > 0) {
      const filtered = candidateAmounts.filter(
        (n) => n >= 10 && n <= 500000 && !isLikelyYear(n)
      );
      if (filtered.length > 0) {
        detectedAmount = Math.max(...filtered);
        confidence = 'low';
      }
    }
  }

  // 2. Extract Merchant (e.g. NAYARA ENERGY, FISHERMAN'S WHARF, etc.)
  let detectedMerchant = '';
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Skip generic headings and sample text
    const isGeneric = GENERIC_HEADER_WORDS.some((h) => lower.includes(h));
    const hasPhone = PHONE_PATTERN.test(line);
    const hasGstin = GSTIN_PATTERN.test(line);

    if (!isGeneric && !hasPhone && !hasGstin && line.length >= 3 && line.length <= 50) {
      if (/[a-zA-Z]{3,}/.test(line)) {
        detectedMerchant = line
          .replace(/^[#*•\-_= ]+/, '')
          .replace(/[#*•\-_= ]+$/, '')
          .trim();
        break;
      }
    }
  }
  if (!detectedMerchant) {
    detectedMerchant = 'Merchant Receipt';
  }

  // 3. Extract Date (e.g. 23/09/2026)
  let detectedDate = '';
  const datePatterns = [
    /\b(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})\b/, // DD/MM/YYYY
    /\b(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})\b/, // YYYY/MM/DD
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})\b/i,
  ];

  for (const pattern of datePatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      detectedDate = normalizeDate(match[0]);
      if (detectedDate) break;
    }
  }

  if (!detectedDate) {
    detectedDate = new Date().toISOString().split('T')[0];
  }

  return {
    merchant: detectedMerchant,
    amount: Math.round(detectedAmount * 100) / 100, // keep 2 decimal precision
    date: detectedDate,
    rawText: trimmed,
    confidence,
  };
}

/**
 * Parses written amounts like "Rupees Two Thousand Only" or "Two Thousand Five Hundred Rupees".
 */
function parseRupeesInWords(text: string): number {
  const match = text.match(/(?:rupees|rs\.?)\s+([a-z\s]+?)\s+(?:only|\/-)/i) ||
                text.match(/\(([a-z\s]+?)\s+(?:only|\/-)\)/i);
  if (!match || !match[1]) return 0;

  const words = match[1].toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  
  const wordToNum: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
    seventy: 70, eighty: 80, ninety: 90,
  };

  let total = 0;
  let current = 0;

  for (const w of words) {
    if (wordToNum[w]) {
      current += wordToNum[w];
    } else if (w === 'hundred') {
      current = (current === 0 ? 1 : current) * 100;
    } else if (w === 'thousand') {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else if (w === 'lakh' || w === 'lac') {
      total += (current === 0 ? 1 : current) * 100000;
      current = 0;
    }
  }

  total += current;
  return total > 0 ? total : 0;
}

/**
 * Extracts numbers with optional decimals from a string.
 */
function extractNumbersFromLine(line: string): number[] {
  // Exclude phone numbers, GSTIN, time stamps
  if (PHONE_PATTERN.test(line) || GSTIN_PATTERN.test(line) || PINCODE_PATTERN.test(line)) {
    // Only extract if explicitly marked with currency
    const currencyMatch = line.match(/[₹\s]*(?:rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (currencyMatch && currencyMatch[1]) {
      const parsed = parseFloat(currencyMatch[1].replace(/,/g, ''));
      return isNaN(parsed) ? [] : [parsed];
    }
    return [];
  }

  const matches = line.match(/\b\d+(?:,\d{3})*(?:\.\d{1,2})?\b/g);
  if (!matches) return [];

  const results: number[] = [];
  for (const m of matches) {
    const clean = m.replace(/,/g, '');
    const num = parseFloat(clean);
    if (!isNaN(num) && num > 0) {
      results.push(num);
    }
  }
  return results;
}

/**
 * Checks if a number looks like a genuine payable bill amount.
 */
function isValidBillAmount(amount: number, contextText = ''): boolean {
  if (isNaN(amount) || amount <= 0) return false;
  // Discard 10-digit phone numbers
  if (amount >= 6000000000 && amount <= 9999999999) return false;
  // Discard 6-digit pin codes
  if (amount >= 100000 && amount <= 999999 && !contextText.includes('.')) return false;
  // Discard 4-digit years unless prefixed with currency
  if (isLikelyYear(amount) && !/[₹$]|\brs\b|\binr\b/i.test(contextText)) return false;
  return true;
}

function isLikelyYear(num: number): boolean {
  return num >= 2020 && num <= 2035 && Number.isInteger(num);
}

/**
 * Normalizes different date formats to YYYY-MM-DD.
 */
function normalizeDate(rawDate: string): string {
  try {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    // try manual parse
  }

  const dmyMatch = rawDate.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  return '';
}
