/**
 * Financial formatters using integer paise.
 * ₹1 = 100 paise.
 */

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees.replace(/,/g, '')) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Formats paise into Indian Rupee format (e.g. ₹2,500 or ₹416.67)
 */
export function formatINR(paise: number, options: { showSign?: boolean; alwaysDecimals?: boolean } = {}): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  const hasDecimal = options.alwaysDecimals || absPaise % 100 !== 0;

  const formattedNumber = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  });

  if (options.showSign) {
    if (paise > 0) return `+₹${formattedNumber}`;
    if (paise < 0) return `-₹${formattedNumber}`;
    return `₹0.00`;
  }

  return `${isNegative ? '-' : ''}₹${formattedNumber}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}
