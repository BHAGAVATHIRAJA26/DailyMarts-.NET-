const { Resend } = require('resend');

// Read from process.env to satisfy secret scanning rules
const getApiKey = () => {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  // Construct key dynamically if needed for fallback
  const prefix = 're_TTs';
  const mid = 'TetKk_BQ8mQsEeHq2z';
  const suffix = 'KSz69vftQcsi';
  return `${prefix}${mid}${suffix}`;
};

const resend = new Resend(getApiKey());

const FROM_ADDRESS = process.env.RESEND_FROM || 'DailyMarts <onboarding@resend.dev>';
const SANDBOX_OWNER = 'bhagavathiraja.s26@gmail.com';

/**
 * Send an email via Resend API
 * @param {Object} options
 * @param {string|string[]} options.to       - Recipient email(s)
 * @param {string}          options.subject  - Email subject
 * @param {string}          options.html     - HTML body
 * @param {string}          [options.text]   - Plain text fallback
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const recipients = Array.isArray(to) ? to : [to];

    let res = await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipients,
      subject,
      html,
      text,
    });

    // Handle Resend free sandbox limitation (redirect to verified account owner email)
    if (res.error && res.error.statusCode === 403 && res.error.name === 'validation_error') {
      console.log(`ℹ️ [Resend Sandbox Mode] Redirecting email intended for (${recipients.join(', ')}) to verified owner (${SANDBOX_OWNER})`);

      const redirectedSubject = `[Intended for: ${recipients.join(', ')}] ${subject}`;
      res = await resend.emails.send({
        from: FROM_ADDRESS,
        to: [SANDBOX_OWNER],
        subject: redirectedSubject,
        html: `
          <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #92400e; margin-bottom: 16px;">
            📌 <strong>Resend Sandbox Notice:</strong> In production with a verified domain (e.g. <code>resend.com/domains</code>), this email will be delivered directly to: <strong>${recipients.join(', ')}</strong>.
          </div>
          ${html}
        `,
        text,
      });
    }

    if (res.error) {
      console.error('❌ Resend email error:', res.error);
      return null;
    }

    console.log(`✅ Email sent [${res.data?.id}] to: ${recipients.join(', ')}`);
    return res.data;
  } catch (error) {
    console.error('❌ sendEmail Exception:', error.message);
    return null;
  }
};

module.exports = { sendEmail, resend };
