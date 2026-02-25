/**
 * Format a number as a currency string (e.g. ₱123.45).
 * Change the locale / currency code to match your region.
 */
export function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}
