const nodemailer = require('nodemailer');

// Single seam for outbound email, same idea as utils/notify.js for
// in-app/socket notifications. If SMTP isn't configured (see
// backend/.env.example), this logs the email to the server console
// instead of sending it — the forgot-password flow still works
// end-to-end for local dev or a viva demo without anyone having to set
// up a real mailbox first, and it fails loudly and safely rather than
// throwing halfway through a request.
const isConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

// { to, subject, text } — html is optional, plain text is always sent
// so the console-fallback path is genuinely readable, not just a JSON
// dump.
const sendEmail = async ({ to, subject, text, html }) => {
  if (!isConfigured()) {
    console.log('--------------------------------------------------');
    console.log('[Rakshak] SMTP not configured (see backend/.env.example) \u2014 printing the email instead of sending it:');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('--------------------------------------------------');
    return { delivered: false, reason: 'smtp_not_configured' };
  }

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || 'Rakshak <no-reply@rakshak.test>',
    to,
    subject,
    text,
    html,
  });
  return { delivered: true };
};

module.exports = { sendEmail };
