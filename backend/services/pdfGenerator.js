const PDFDocument = require('pdfkit');

const generateQuotationPDF = (quotation, items, customer, companyName) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Header
            doc.fontSize(20).text(companyName, { align: 'center' });
            doc.moveDown();
            doc.fontSize(16).text('OFFICIAL QUOTATION', { align: 'center', underline: true });
            doc.moveDown();

            // Meta
            doc.fontSize(12).text(`Quotation No: ${quotation.quotation_number}`);
            doc.text(`Date: ${new Date(quotation.created_at).toLocaleDateString()}`);
            doc.moveDown();

            // Customer
            doc.fontSize(14).text('Prepared For:');
            doc.fontSize(12).text(customer?.company_name || 'Unknown Customer');
            if (customer?.email) doc.text(customer.email);
            if (customer?.phone) doc.text(customer.phone);
            doc.moveDown(2);

            // Line Items
            doc.fontSize(14).text('Line Items:');
            doc.moveDown(0.5);
            const validItems = items.filter(i => i.status !== 'UNAVAILABLE');
            const unavailableItems = items.filter(i => i.status === 'UNAVAILABLE');

            validItems.forEach((item, i) => {
                const pName = item.products?.name || item.requested_description;
                const sku = item.products?.sku ? ` (SKU: ${item.products.sku})` : '';
                doc.fontSize(12).text(`${i + 1}. ${pName}${sku}`);
                const qty = item.quantity || 0;
                const unitPrice = parseFloat(item.unit_price).toFixed(2);
                const lineTotal = parseFloat(item.line_total).toFixed(2);
                doc.fontSize(10).text(`    Qty: ${qty} | Unit Price: INR ${unitPrice}  --> Total: INR ${lineTotal}`);
                doc.moveDown(0.5);
            });
            doc.moveDown();

            // Totals
            doc.fontSize(12).text(`Subtotal: INR ${parseFloat(quotation.subtotal).toFixed(2)}`, { align: 'right' });
            if (quotation.discount > 0) {
                doc.text(`Discount: -INR ${parseFloat(quotation.discount).toFixed(2)}`, { align: 'right' });
            }
            doc.text(`GST (18%): INR ${parseFloat(quotation.tax).toFixed(2)}`, { align: 'right' });
            doc.fontSize(14).text(`Grand Total: INR ${parseFloat(quotation.grand_total).toFixed(2)}`, { align: 'right', underline: true });
            doc.moveDown(2);

            // Unsold items notice
            if (unavailableItems.length > 0) {
                doc.moveDown();
                doc.fontSize(12).fillColor('red').text('Please note: We do not provide or supply the following requested items:', { underline: true });
                doc.fillColor('black');
                doc.moveDown(0.5);
                unavailableItems.forEach(item => {
                    doc.fontSize(10).text(`- ${item.requested_description}`);
                });
                doc.moveDown(2);
            }

            // Signature block
            doc.fontSize(12).text('Authorized Signature: _______________________      Date: ____________', { align: 'center' });
            doc.moveDown();
            doc.fontSize(10).text('Please sign and return this quotation to confirm your order.', { align: 'center' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateQuotationPDF };