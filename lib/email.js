const nodemailer = require('nodemailer');

/**
 * Create email transporter
 * Uses SMTP configuration from environment variables
 */
function createTransporter() {
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  // If email configuration is not set, return null (emails will be skipped)
  if (!emailHost || !emailPort || !emailUser || !emailPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: emailHost,
    port: parseInt(emailPort),
    secure: parseInt(emailPort) === 465, // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
}

/**
 * Send email notification
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @returns {Promise<boolean>} - Returns true if email sent successfully, false otherwise
 */
async function sendEmail({ to, subject, html }) {
  try {
    const transporter = createTransporter();
    
    // If transporter is null, email configuration is missing
    if (!transporter) {
      console.log('Email configuration not set. Skipping email send.');
      return false;
    }

    const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;

    const mailOptions = {
      from: emailFrom,
      to: to,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    // Log error but don't throw - email failure shouldn't break the main flow
    console.error('Error sending email:', error.message);
    return false;
  }
}

/**
 * Generate HTML email template for notifications
 * @param {string} message - Notification message
 * @param {string} type - Notification type (ISSUE, REMINDER, FINE)
 * @returns {string} - HTML email content
 */
function generateEmailHTML(message, type) {
  const colors = {
    ISSUE: '#3B82F6', // Blue
    REMINDER: '#F59E0B', // Amber
    FINE: '#EF4444' // Red
  };

  const color = colors[type] || '#6B7280';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Library Management System</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: ${color}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
        <h1 style="margin: 0;">Library Management System</h1>
      </div>
      <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 5px 5px;">
        <div style="background-color: white; padding: 20px; border-radius: 5px; border-left: 4px solid ${color};">
          <p style="font-size: 16px; margin: 0;">${message}</p>
        </div>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>This is an automated notification from the Library Management System.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  sendEmail,
  generateEmailHTML
};

