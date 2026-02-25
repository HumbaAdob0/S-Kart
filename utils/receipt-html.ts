import type { Receipt } from '@/types/grocery';
import { formatCurrency } from '@/utils/format-currency';

/**
 * Generate a styled HTML string for the receipt so it can be
 * converted to PDF via `expo-print` and shared / saved.
 */
export function buildReceiptHtml(receipt: Receipt): string {
  const formattedDate = new Date(receipt.date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemRows = receipt.items
    .map(
      (entry) => `
      <tr>
        <td class="item-name">${entry.product.name}</td>
        <td class="center">${entry.quantity}</td>
        <td class="right">${formatCurrency(entry.product.price)}</td>
        <td class="right">${formatCurrency(entry.product.price * entry.quantity)}</td>
      </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fff;
      color: #333;
      padding: 24px;
    }
    .store-name {
      text-align: center;
      font-size: 28px;
      font-weight: 800;
      color: #0a7ea4;
      letter-spacing: 3px;
    }
    .tagline {
      text-align: center;
      font-size: 12px;
      color: #687076;
      margin-top: 4px;
    }
    .divider {
      border: none;
      border-top: 1px dashed #ccc;
      margin: 14px 0;
    }
    .meta {
      font-size: 12px;
      color: #555;
      margin: 2px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    th {
      font-size: 11px;
      font-weight: 700;
      color: #555;
      padding: 4px 0;
      border-bottom: 1px solid #ddd;
    }
    td {
      font-size: 12px;
      padding: 5px 0;
      vertical-align: top;
    }
    .item-name { width: 45%; }
    .center { text-align: center; }
    .right { text-align: right; }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 14px;
    }
    .grand-total {
      font-size: 20px;
      font-weight: 800;
      color: #0a7ea4;
    }
    .footer {
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      color: #333;
    }
    .footer-small {
      text-align: center;
      font-size: 11px;
      color: #888;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="store-name">S-KART</div>
  <div class="tagline">Your Smart Grocery POS</div>
  <hr class="divider" />

  <p class="meta">Receipt #: ${receipt.id}</p>
  <p class="meta">Date: ${formattedDate}</p>
  <hr class="divider" />

  <table>
    <thead>
      <tr>
        <th style="text-align:left">Item</th>
        <th class="center">Qty</th>
        <th class="right">Price</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <hr class="divider" />

  <div class="totals-row">
    <span>Subtotal</span>
    <span>${formatCurrency(receipt.subtotal)}</span>
  </div>
  <div class="totals-row">
    <span>Tax (12%)</span>
    <span>${formatCurrency(receipt.tax)}</span>
  </div>
  <hr style="border:none;border-top:1px solid #ddd;margin:6px 0" />
  <div class="totals-row grand-total">
    <span>TOTAL</span>
    <span>${formatCurrency(receipt.total)}</span>
  </div>

  <hr class="divider" />
  <p class="footer">Thank you for shopping at S-Kart!</p>
  <p class="footer-small">Please present QR code at the counter.</p>
</body>
</html>`;
}
