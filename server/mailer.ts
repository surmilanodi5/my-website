import nodemailer from 'nodemailer';

export interface ContactEmailPayload {
  toEmail: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}

export type EmailDispatchResult =
  | { configured: false; sent: false }
  | { configured: true; sent: true; provider: 'smtp' | 'resend' }
  | { configured: true; sent: false; provider: 'smtp' | 'resend'; error: string };

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM?.trim() || user || '';

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    user,
    pass,
    from,
  };
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || process.env.SMTP_FROM?.trim();
  if (!apiKey || !from) {
    return null;
  }
  return { apiKey, from };
}

export function isEmailServiceConfigured(): boolean {
  return Boolean(getSmtpConfig() || getResendConfig());
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<EmailDispatchResult> {
  const recipient = process.env.CONTACT_RECIPIENT_EMAIL?.trim() || payload.toEmail.trim();
  if (!recipient) {
    return { configured: false, sent: false };
  }

  const smtp = getSmtpConfig();
  if (smtp) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
      });

      await transporter.sendMail({
        from: `"Portfolio Contact" <${smtp.from}>`,
        to: recipient,
        replyTo: `${payload.senderName} <${payload.senderEmail}>`,
        subject: `[Portfolio Contact] ${payload.subject}`,
        text: [
          `New contact enquiry from your portfolio website:`,
          ``,
          `Name: ${payload.senderName}`,
          `Email: ${payload.senderEmail}`,
          `Subject: ${payload.subject}`,
          ``,
          `Message:`,
          payload.message,
        ].join('\n'),
      });

      return { configured: true, sent: true, provider: 'smtp' };
    } catch (err) {
      return {
        configured: true,
        sent: false,
        provider: 'smtp',
        error: err instanceof Error ? err.message : 'SMTP delivery error',
      };
    }
  }

  const resend = getResendConfig();
  if (resend) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resend.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resend.from,
          to: [recipient],
          reply_to: payload.senderEmail,
          subject: `[Portfolio Contact] ${payload.subject}`,
          text: [
            `New contact enquiry from your portfolio website:`,
            ``,
            `Name: ${payload.senderName}`,
            `Email: ${payload.senderEmail}`,
            `Subject: ${payload.subject}`,
            ``,
            `Message:`,
            payload.message,
          ].join('\n'),
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        return {
          configured: true,
          sent: false,
          provider: 'resend',
          error: errBody || `Resend returned ${response.status}`,
        };
      }

      return { configured: true, sent: true, provider: 'resend' };
    } catch (err) {
      return {
        configured: true,
        sent: false,
        provider: 'resend',
        error: err instanceof Error ? err.message : 'Resend delivery error',
      };
    }
  }

  return { configured: false, sent: false };
}
