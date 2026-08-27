/**
 * Printable receipt HTML (same layout as finance/cashier/receipts.js handlePrint).
 * Used by cashier receipts and manager transaction reports.
 */

export const RECEIPT_PRINT_STYLES = `
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; color: #222; font-size: 11px; line-height: 1.4; }
    .tax-inv-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #333; }
    .tax-inv-left { display: flex; align-items: flex-start; gap: 20px; flex: 1; }
    .tax-inv-logo { max-height: 60px; max-width: 140px; object-fit: contain; }
    .tax-inv-company { flex: 1; }
    .tax-inv-company h2 { margin: 0 0 10px 0; font-size: 1.15rem; font-weight: 700; color: #111; letter-spacing: 0.02em; }
    .tax-inv-address { margin: 0; color: #444; font-size: 10px; line-height: 1.5; }
    .tax-inv-contact { margin-top: 8px; font-size: 10px; color: #555; }
    .tax-inv-contact span { margin-right: 16px; }
    .tax-inv-meta { text-align: right; min-width: 180px; }
    .tax-inv-meta p { margin: 0 0 6px 0; font-size: 11px; }
    .tax-inv-title { text-align: center; font-size: 1.6rem; font-weight: 700; margin: 24px 0; letter-spacing: 0.05em; }
    .tax-inv-customer { margin-bottom: 18px; padding: 8px 0; }
    .tax-inv-customer strong { display: inline-block; min-width: 130px; font-size: 11px; }
    .tax-inv-table { width: 100%; border-collapse: collapse; margin: 0 0 20px 0; font-size: 10px; border: 1px solid #333; }
    .tax-inv-table th, .tax-inv-table td { border: 1px solid #333; padding: 6px 8px; vertical-align: middle; }
    .tax-inv-table th { background: #f0f0f0; font-weight: 700; text-align: center; font-size: 10px; }
    .tax-inv-table th.tl { text-align: left; }
    .tax-inv-table th .sub { display: block; font-weight: 400; font-size: 9px; color: #444; margin-top: 1px; }
    .tax-inv-table .tc { text-align: center; }
    .tax-inv-table .tr { text-align: right; }
    .tax-inv-table .tl { text-align: left; }
    .tax-inv-table tbody tr { background: #fff; }
    .tax-inv-table .total-row td { font-weight: 600; background: #f0f0f0; }
    .tax-inv-table .total-row.total-first td { border-top: 2px solid #333; }
    .tax-inv-table .total-final td { font-weight: 700; font-size: 11px; background: #e8e8e8; }
    .tax-inv-table .col-labels td { border: 1px solid #333; border-top: none; background: #fff; font-size: 9px; color: #444; padding: 4px 8px; text-align: right; }
    .tax-inv-footer { margin-top: 28px; font-size: 11px; border-top: 1px solid #ccc; padding-top: 16px; }
    .tax-inv-footer-row { margin-bottom: 12px; }
    .tax-inv-footer-row label { display: inline-block; min-width: 180px; font-weight: 600; }
    .tax-inv-disclaimer { margin-top: 28px; font-style: italic; color: #666; font-size: 10px; }
    @media print { body { padding: 16px; } .tax-inv-logo { max-height: 52px; } }
`;

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-TZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

function formatDateInvoice(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function numberToWords(n) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const num = Math.floor(parseFloat(n) || 0);
  if (num === 0) return 'Zero';
  const g = (x) => {
    if (x < 20) return ones[x];
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
    return ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + g(x % 100) : '');
  };
  if (num < 1000) return g(num);
  if (num < 1000000) return g(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + g(num % 1000) : '');
  if (num < 1000000000) return g(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + numberToWords(num % 1000000) : '');
  return g(Math.floor(num / 1000000000)) + ' Billion' + (num % 1000000000 ? ' ' + numberToWords(num % 1000000000) : '');
}

/**
 * @param {object} receipt - payment row (same shape as cashier receipts)
 * @param {string} logoSrc - data URL or absolute URL for logo
 * @returns {string} inner HTML for one receipt (no html/body wrapper)
 */
export function buildReceiptBodyHtml(receipt, logoSrc) {
  const totalAmount = (() => {
    if (receipt.items && receipt.items.length > 0) {
      return receipt.items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const unit = Number(item.unit_price) || 0;
        const itemTotal =
          item.total_amount != null && item.total_amount !== undefined
            ? Number(item.total_amount) || 0
            : qty * unit;
        return sum + itemTotal;
      }, 0);
    }
    const qty = Number(receipt.quantity) || 0;
    const unit = Number(receipt.unit_price) || 0;
    return qty * unit;
  })();

  const dateStr = formatDateInvoice(receipt.created_at);
  const trnNo = '182-150-770';
  const invNum = `RCPT-${receipt.id}`;
  const customerName = String(receipt.customer_name || '—')
    .replace(/</g, '&lt;')
    .toUpperCase();
  const customerPhone = (receipt.customer_phone || '—').replace(/</g, '&lt;');

  let items = [];
  if (receipt.items && receipt.items.length > 0) {
    items = receipt.items;
  } else {
    items = [{
      part_name: receipt.sparepart_name || '—',
      part_number: receipt.sparepart_number || '—',
      quantity: receipt.quantity || 1,
      unit_price: receipt.unit_price || 0,
      total_amount: parseFloat(receipt.unit_price || 0) * (parseInt(receipt.quantity || 1, 10) || 1)
    }];
  }

  const hasItems = items.length > 0;
  const subTotal = hasItems
    ? items.reduce((s, it) => s + (parseFloat(it.unit_price) || 0) * (parseInt(it.quantity, 10) || 1), 0)
    : totalAmount;
  const discountAmt = parseFloat(receipt.discount_amount) || 0;
  const totalAmountFinal = Math.max(0, subTotal - discountAmt);
  let amountReceived = Number(receipt.amount_received) || 0;
  let amountRemain = Math.max(0, totalAmountFinal - amountReceived);

  const rawPaymentMethod = String(receipt.payment_method || '').trim();
  const normalizedPaymentMethod = rawPaymentMethod.toLowerCase();
  const paymentMethodLabel = (() => {
    if (!rawPaymentMethod) return '—';
    if (normalizedPaymentMethod.includes('cash')) return 'Cash';
    if (normalizedPaymentMethod.includes('bank')) return 'Bank';
    if (normalizedPaymentMethod.includes('airtel')) return 'Airtel money';
    if (/m\s*-?\s*pesa/.test(normalizedPaymentMethod)) return 'M -pesa';
    if (normalizedPaymentMethod.includes('mix') || normalizedPaymentMethod.includes('yas')) return 'Mix by Yas';
    if (normalizedPaymentMethod === 'mixed' && Number(receipt.mix_by_yas) > 0) return 'Mix by Yas';
    return rawPaymentMethod;
  })();

  const logoImg = logoSrc ? `<img src="${String(logoSrc).replace(/"/g, '&quot;')}" alt="Logo" class="tax-inv-logo" />` : '';

  const itemRows = hasItems
    ? items.map((it, i) => {
        const qty = parseInt(it.quantity, 10) || 1;
        const rate = parseFloat(it.unit_price) || 0;
        const amount = rate * qty;
        return `<tr>
            <td class="tc">${i + 1}</td>
            <td>${(it.part_name || it.sparepart_name || '—').replace(/</g, '&lt;')}</td>
            <td>${String(it.part_number || it.sparepart_number || '—').toUpperCase().replace(/</g, '&lt;')}</td>
            <td class="tr">${qty}</td>
            <td class="tr">${formatCurrency(rate)}</td>
            <td>PCS</td>
            <td class="tr">${formatCurrency(amount)}</td>
            <td class="tr">${formatCurrency(amount)}</td>
          </tr>`;
      }).join('')
    : `<tr>
          <td class="tc">1</td>
          <td>—</td>
          <td>—</td>
          <td class="tr">1</td>
          <td class="tr">${formatCurrency(totalAmount)}</td>
          <td>PCS</td>
          <td class="tr">${formatCurrency(totalAmount)}</td>
          <td class="tr">${formatCurrency(totalAmount)}</td>
        </tr>`;

  const amountInWords = numberToWords(Math.floor(totalAmountFinal)) + ' TZS Only';

  const isLoanPayment = String(receipt?.payment_type || '')
    .toLowerCase()
    .includes('loan');
  const cashBreakdown = Number(receipt?.cash) || 0;
  const bankBreakdown = Number(receipt?.bank_transfer) || 0;
  const airtelBreakdown = Number(receipt?.airtel_money) || 0;
  const mpesaBreakdown = Number(receipt?.mpesa) || 0;
  const yasBreakdown = Number(receipt?.mix_by_yas) || 0;

  const channelSegments = [
    { label: 'cash', value: cashBreakdown },
    { label: 'bank transfer', value: bankBreakdown },
    { label: 'Airtel money', value: airtelBreakdown },
    { label: 'M -pesa', value: mpesaBreakdown },
    { label: 'Mix by Yas', value: yasBreakdown },
  ].filter((s) => Number(s.value) > 0);

  const isMultiMethodTransaction = channelSegments.length > 1;
  const isMixedPaymentMethod = normalizedPaymentMethod === 'mixed';
  const totalFromChannels = channelSegments.reduce((sum, s) => sum + Number(s.value || 0), 0);

  if (isMultiMethodTransaction || isMixedPaymentMethod) {
    amountReceived = totalFromChannels > 0 ? totalFromChannels : amountReceived;
    amountRemain = Math.max(0, totalAmountFinal - amountReceived);
  }

  const amountReceivedRowsHtml = isMultiMethodTransaction
    ? `
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">
          Amount received by<br/>
          ${channelSegments
            .map((s) => `${String(s.label).replace(/</g, '&lt;')} ${formatCurrency(s.value)}`)
            .join('<br/>')}
        </td>
        <td class="tr">${formatCurrency(amountReceived)}</td>
      </tr>`
    : `
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">Amount received by ${paymentMethodLabel.replace(/</g, '&lt;')}</td>
        <td class="tr">${formatCurrency(amountReceived)}</td>
      </tr>`;

  const loanPaymentBreakdownHtml = isLoanPayment
    ? `
        <div class="tax-inv-footer-row"><label>CASH (TZS):</label> ${formatCurrency(cashBreakdown)}</div>
        <div class="tax-inv-footer-row"><label>BANK TRANSFER (TZS):</label> ${formatCurrency(bankBreakdown)}</div>
        <div class="tax-inv-footer-row"><label>AIRTEL MONEY (TZS):</label> ${formatCurrency(airtelBreakdown)}</div>
        <div class="tax-inv-footer-row"><label>M-PESA (TZS):</label> ${formatCurrency(mpesaBreakdown)}</div>
        <div class="tax-inv-footer-row"><label>MIX BY YAS (TZS):</label> ${formatCurrency(yasBreakdown)}</div>
      `
    : '';

  return `
  <div class="tax-inv-top">
    <div class="tax-inv-left">
      ${logoImg}
      <div class="tax-inv-company">
        <h2>Mamuya Auto Spare Parts</h2>
        <p class="tax-inv-address">Kilimanjaro, Tanzania</p>
        <div class="tax-inv-contact">
          <span>Tel: +255 757171337</span>
        </div>
      </div>
    </div>
    <div class="tax-inv-meta">
      <p><strong>TRN NO:</strong> ${(trnNo).replace(/</g, '&lt;')}</p>
      <p><strong>Receipt No:</strong> ${invNum}</p>
      <p><strong>Date:</strong> ${dateStr}</p>
    </div>
  </div>

  <h1 class="tax-inv-title">RECEIPT</h1>

  <div class="tax-inv-customer">
    <strong>Customer Name:</strong> ${customerName}<br />
    <strong>Phone:</strong> ${customerPhone}
  </div>

  <table class="tax-inv-table">
    <thead>
      <tr>
        <th style="width:4%">Sr.No.</th>
        <th style="width:22%" class="tl">Description</th>
        <th style="width:11%" class="tl">Part No.</th>
        <th style="width:7%">Quantity</th>
        <th style="width:10%"><span>Price</span><span class="sub">TZS</span></th>
        <th style="width:6%">Per</th>
        <th style="width:11%"><span>Amount</span><span class="sub">TZS</span></th>
        <th style="width:12%"><span>Total Amount</span><span class="sub">TZS</span></th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="total-row total-first">
        <td colspan="7" class="tr" style="font-weight:600;">Sub Total</td>
        <td class="tr">${formatCurrency(subTotal)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">Discount</td>
        <td class="tr">-${formatCurrency(discountAmt)}</td>
      </tr>
      ${amountReceivedRowsHtml}
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">Amount Remain</td>
        <td class="tr">${formatCurrency(amountRemain)}</td>
      </tr>
      <tr class="total-row total-final">
        <td colspan="7" class="tr" style="font-weight:700;">Total Received</td>
        <td class="tr">${formatCurrency(amountReceived)}</td>
      </tr>
    </tbody>
  </table>

  <div class="tax-inv-footer">
    <div class="tax-inv-footer-row"><label>TOTAL AMOUNT IN WORDS :</label> ${amountInWords}</div>
    ${loanPaymentBreakdownHtml}
  </div>

  <p class="tax-inv-disclaimer">*This is a computer generated receipt, hence no signature is required.*</p>`;
}

export function buildReceiptPrintDocument(receipt, logoSrc) {
  const invNum = `RCPT-${receipt.id}`;
  const body = buildReceiptBodyHtml(receipt, logoSrc);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${invNum}</title>
  <style>${RECEIPT_PRINT_STYLES}</style>
</head>
<body>${body}</body>
</html>`;
}
