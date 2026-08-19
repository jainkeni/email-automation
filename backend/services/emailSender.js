const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initialize the SMTP transporter
 */
const initializeTransporter = () => {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.warn('⚠️ SMTP_USER or SMTP_PASSWORD is not set. Sending emails will fail.');
    }


    console.log('✅ SMTP Transporter initialized');
    return transporter;
};

/**
 * Send an email reply to the customer
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject (usually "Re: original subject")
 * @param {string} body - Email body content
 * @returns {Object} - Nodemailer send result
 */
const sendReply = async (to, subject, body, attachments = []) => {
    if (!transporter) {
        initializeTransporter();
    }

    const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'Company'}" <${process.env.SMTP_USER}>`,
        to: to,
        subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
        text: body,
        html: formatEmailHTML(body),
        attachments: attachments,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Reply sent to ${to} | Message ID: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`❌ Failed to send reply to ${to}:`, error.message);
        throw error;
    }
};

/**
 * Convert plain text email body to a clean HTML format
 */
const formatEmailHTML = (textBody) => {
    const htmlBody = textBody
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6; max-width: 600px;">
      <p>${htmlBody}</p>
    </div>
  `;
};

/**
 * Verify SMTP connection
 */
const verifyConnection = async () => {
    if (!transporter) {
        initializeTransporter();
    }
    try {
        await transporter.verify();
        console.log('✅ SMTP connection verified');
        return true;
    } catch (error) {
        console.error('❌ SMTP verification failed:', error.message);
        return false;
    }
};

module.exports = {
    initializeTransporter,
    sendReply,
    verifyConnection,
};
