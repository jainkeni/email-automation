/**
 * Quotation PDF Service
 * 
 * Generates professional quotation PDFs.
 * Uses pure HTML→PDF approach without heavy dependencies.
 * The generated HTML can be attached as a styled HTML email or
 * rendered via a headless browser (puppeteer) if needed.
 * 
 * For MVP: generates an HTML quotation that can be sent as email body.
 */

const { getSupabase } = require('../config/db');

/**
 * Generate a quotation email body (HTML format) from quotation data.
 * 
 * @param {string} quotationId - UUID
 * @returns {Object} { html, text, subject }
 */
const generateQuotationEmail = async (quotationId) => {
  const supabase = getSupabase();

  // Get quotation with items and products
  const { data: quotation, error: qErr } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .single();

  if (qErr || !quotation) throw new Error('Quotation not found');

  const { data: items, error: iErr } = await supabase
    .from('quotation_items')
    .select('*, products(sku, name, unit, category, material, size)')
    .eq('quotation_id', quotationId);

  if (iErr) throw new Error('Failed to fetch quotation items');

  // Get customer
  let customer = null;
  if (quotation.customer_id) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', quotation.customer_id)
      .single();
    customer = data;
  }

  // Get company settings
  const { data: settings } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  const companyName = settings?.company_name || 'MailPilot Industrial Supplies';
  const companyEmail = settings?.contact_email || process.env.SMTP_USER || '';
  const companyPhone = settings?.contact_phone || '';
  const companyLocation = settings?.location || '';

  const validUntil = quotation.valid_until
    ? new Date(quotation.valid_until).toLocaleDateString('en-US')
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US');

  const quotationDate = new Date(quotation.created_at).toLocaleDateString('en-US');

  // Build item rows
  const validItems = items.filter(item => item.product_id != null && item.status !== 'REJECTED' && item.status !== 'UNAVAILABLE');
  const unavailableItems = items.filter(item => item.product_id == null || item.status === 'UNAVAILABLE');

  const itemRows = validItems.map((item, index) => {
    const product = item.products;
    const sku = product?.sku || '—';
    const desc = product ? `${product.name}` : item.requested_description;
    const qty = item.quantity || '—';
    const unitPrice = item.unit_price ? `$${formatNumber(item.unit_price)}` : '—';
    const total = item.line_total ? `$${formatNumber(item.line_total)}` : '—';
    const unit = product?.unit || 'PCS';

    return `<tr>
      <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb;">${index + 1}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; font-family:monospace; font-size:13px;">${sku}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb;">${desc}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:center;">${qty} ${unit}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:right;">${unitPrice}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:600;">${total}</td>
    </tr>`;
  }).join('');

  // Build HTML
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; font-family:Arial, sans-serif; color:#1f2937; background:#f9fafb;">
  <div style="max-width:700px; margin:24px auto; background:#fff; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg, #6366f1, #8b5cf6); padding:24px 32px; color:#fff;">
      <h1 style="margin:0; font-size:22px; font-weight:700;">${companyName}</h1>
      <p style="margin:4px 0 0; font-size:13px; opacity:0.9;">${companyLocation}${companyPhone ? ' | ' + companyPhone : ''}${companyEmail ? ' | ' + companyEmail : ''}</p>
    </div>
    
    <!-- Quotation Info -->
    <div style="padding:24px 32px; border-bottom:1px solid #e5e7eb;">
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap;">
        <div>
          <h2 style="margin:0 0 16px; font-size:20px; color:#4f46e5;">QUOTATION</h2>
          <p style="margin:4px 0; font-size:14px;"><strong>Quotation No:</strong> ${quotation.quotation_number}</p>
          <p style="margin:4px 0; font-size:14px;"><strong>Date:</strong> ${quotationDate}</p>
          <p style="margin:4px 0; font-size:14px;"><strong>Valid Until:</strong> ${validUntil}</p>
        </div>
        <div style="text-align:right; min-width:200px;">
          <p style="margin:0; font-size:13px; color:#6b7280; text-transform:uppercase;">Bill To</p>
          <p style="margin:4px 0; font-size:15px; font-weight:600;">${customer?.company_name || 'Customer'}</p>
          <p style="margin:2px 0; font-size:14px;">${customer?.contact_name || ''}</p>
          <p style="margin:2px 0; font-size:14px; color:#6b7280;">${customer?.email || ''}</p>
          ${customer?.phone ? `<p style="margin:2px 0; font-size:14px; color:#6b7280;">${customer.phone}</p>` : ''}
        </div>
      </div>
    </div>
    
    <!-- Items Table -->
    <div style="padding:0 32px;">
      <table style="width:100%; border-collapse:collapse; margin:20px 0;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px; text-align:left; font-size:12px; color:#6b7280; text-transform:uppercase;">#</th>
            <th style="padding:10px 12px; text-align:left; font-size:12px; color:#6b7280; text-transform:uppercase;">SKU</th>
            <th style="padding:10px 12px; text-align:left; font-size:12px; color:#6b7280; text-transform:uppercase;">Description</th>
            <th style="padding:10px 12px; text-align:center; font-size:12px; color:#6b7280; text-transform:uppercase;">Qty</th>
            <th style="padding:10px 12px; text-align:right; font-size:12px; color:#6b7280; text-transform:uppercase;">Unit Price</th>
            <th style="padding:10px 12px; text-align:right; font-size:12px; color:#6b7280; text-transform:uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>
    
    <!-- Totals -->
    <div style="padding:0 32px 24px;">
      <div style="display:flex; justify-content:flex-end;">
        <table style="min-width:250px; border-collapse:collapse;">
          <tr>
            <td style="padding:8px 16px; font-size:14px; color:#6b7280;">Subtotal</td>
            <td style="padding:8px 16px; font-size:14px; text-align:right;">$${formatNumber(quotation.subtotal)}</td>
          </tr>
          ${quotation.discount > 0 ? `
          <tr>
            <td style="padding:8px 16px; font-size:14px; color:#6b7280;">Discount</td>
            <td style="padding:8px 16px; font-size:14px; text-align:right; color:#10b981;">-$${formatNumber(quotation.discount)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:8px 16px; font-size:14px; color:#6b7280;">GST (18%)</td>
            <td style="padding:8px 16px; font-size:14px; text-align:right;">$${formatNumber(quotation.tax)}</td>
          </tr>
          <tr style="border-top:2px solid #4f46e5;">
            <td style="padding:12px 16px; font-size:16px; font-weight:700; color:#1f2937;">Grand Total</td>
            <td style="padding:12px 16px; font-size:16px; font-weight:700; text-align:right; color:#4f46e5;">$${formatNumber(quotation.grand_total)}</td>
          </tr>
        </table>
      </div>
    </div>
    
    ${unavailableItems.length > 0 ? `
    <div style="padding:16px 32px; background:#fff1f2; border-top:1px solid #fecdd3; border-bottom:1px solid #fecdd3;">
      <h3 style="margin:0 0 8px; font-size:14px; color:#be123c;">Items Not Available</h3>
      <p style="margin:0 0 4px; font-size:13px; color:#9f1239;">Please note that we do not provide service or supply for the following items requested in your inquiry:</p>
      <ul style="margin:0; padding:0 0 0 20px; font-size:13px; color:#9f1239;">
        ${unavailableItems.map(item => `<li>${item.requested_description}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Terms -->
    <div style="padding:20px 32px; background:#f9fafb; border-top:1px solid #e5e7eb;">
      <h3 style="margin:0 0 8px; font-size:14px; color:#374151;">Terms & Conditions</h3>
      <ul style="margin:0; padding:0 0 0 20px; font-size:13px; color:#6b7280; line-height:1.8;">
        <li>Prices are in Indian Rupees (INR) and inclusive of applicable taxes as shown.</li>
        <li>Quotation valid until ${validUntil}.</li>
        <li>Payment terms: Net 30 days from invoice date for verified businesses.</li>
        <li>Delivery: Subject to stock availability, typically 7-14 working days.</li>
        <li>Warranty: Standard manufacturer warranty applies.</li>
      </ul>
    </div>
    
    <!-- Footer -->
    <div style="padding:16px 32px; text-align:center; font-size:12px; color:#9ca3af; border-top:1px solid #e5e7eb;">
      ${companyName} | This quotation was generated by MailPilot AI Quotation System
    </div>
  </div>
</body>
</html>`;

  // Plain text version
  const textLines = [`QUOTATION`, ``, `Quotation No: ${quotation.quotation_number}`, `Date: ${quotationDate}`, `Valid Until: ${validUntil}`, ``];

  if (customer) {
    textLines.push(`Customer: ${customer.company_name}`);
    if (customer.contact_name) textLines.push(`Contact: ${customer.contact_name}`);
    textLines.push(``);
  }

  textLines.push(`Items:`);
  validItems.forEach((item, i) => {
    const product = item.products;
    textLines.push(`${i + 1}. ${product?.name || item.requested_description}`);
    textLines.push(`   SKU: ${product?.sku || '—'}`);
    textLines.push(`   Quantity: ${item.quantity || '—'} ${product?.unit || 'PCS'}`);
    textLines.push(`   Unit Price: $${formatNumber(item.unit_price)}`);
    textLines.push(`   Total: $${formatNumber(item.line_total)}`);
    textLines.push(``);
  });

  if (unavailableItems.length > 0) {
    textLines.push(`PLEASE NOTE:`);
    textLines.push(`We do not provide or supply the following requested items:`);
    unavailableItems.forEach(item => {
      textLines.push(`- ${item.requested_description}`);
    });
    textLines.push(``);
  }

  textLines.push(`Subtotal: $${formatNumber(quotation.subtotal)}`);
  if (quotation.discount > 0) textLines.push(`Discount: -$${formatNumber(quotation.discount)}`);
  textLines.push(`GST (18%): $${formatNumber(quotation.tax)}`);
  textLines.push(`Grand Total: $${formatNumber(quotation.grand_total)}`);
  textLines.push(``);
  textLines.push(`Thank you for your enquiry.`);
  textLines.push(`${companyName}`);

  return {
    html,
    text: textLines.join('\n'),
    subject: `Quotation ${quotation.quotation_number}`,
    quotation,
    customer,
    items,
  };
};

function formatNumber(num) {
  if (!num && num !== 0) return '0';
  return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

module.exports = {
  generateQuotationEmail,
};
