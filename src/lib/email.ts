import nodemailer from "nodemailer";

const smtpPort = Number(process.env.SMTP_PORT || "587");
const smtpSecure = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === "true"
  : smtpPort === 465;
const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

// Konfiguracja transportera email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.SMTP_USER,
    pass: smtpPass,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailTemplateOptions {
  preheader?: string;
  title: string;
  intro?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  outro?: string;
}

interface ResetPasswordTemplateOptions {
  userName?: string | null;
  resetUrl: string;
}

interface InAppNotificationTemplateOptions {
  title: string;
  message: string;
  targetUrl?: string;
}

function buildEmailTemplate({
  preheader,
  title,
  intro,
  body,
  ctaText,
  ctaUrl,
  outro,
}: EmailTemplateOptions): string {
  return `
    <!doctype html>
    <html lang="pl">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#1f2937;">
        <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader || title}</span>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;">
                    <div style="font-size:18px;font-weight:700;">Family Planner</div>
                    <div style="font-size:13px;opacity:.9;">Powiadomienia i bezpieczeństwo konta</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px;">
                    <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#111827;">${title}</h1>
                    ${intro ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">${intro}</p>` : ""}
                    <div style="font-size:15px;line-height:1.7;color:#374151;">${body}</div>
                    ${ctaText && ctaUrl ? `
                      <div style="margin:22px 0 14px;">
                        <a href="${ctaUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
                          ${ctaText}
                        </a>
                      </div>
                    ` : ""}
                    ${outro ? `<p style="margin:14px 0 0;font-size:13px;color:#6b7280;">${outro}</p>` : ""}
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;line-height:1.6;">
                    To jest automatyczna wiadomość z aplikacji Family Planner. Nie odpowiadaj na ten email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function buildResetPasswordEmail({ userName, resetUrl }: ResetPasswordTemplateOptions): string {
  const intro = userName ? `Cześć ${userName},` : "Cześć,";
  const body = `
    Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.<br/>
    Link resetujący jest ważny przez <strong>1 godzinę</strong>.<br/><br/>
    Jeśli to nie Ty inicjowałeś/aś tę prośbę, możesz zignorować tę wiadomość.
    Twoje hasło pozostanie bez zmian.
    <p style="margin:12px 0 0;font-size:13px;color:#6b7280;word-break:break-all;">${resetUrl}</p>
  `;

  return buildEmailTemplate({
    preheader: "Reset hasła - link ważny 1 godzinę",
    title: "Reset hasła",
    intro,
    body,
    ctaText: "Ustaw nowe hasło",
    ctaUrl: resetUrl,
    outro: "Jeśli masz problem z przyciskiem, skopiuj i wklej link z wiadomości do przeglądarki.",
  });
}

export function buildInAppNotificationEmail({
  title,
  message,
  targetUrl,
}: InAppNotificationTemplateOptions): string {
  const body = `<p style="margin:0;">${message}</p>`;

  return buildEmailTemplate({
    preheader: `Nowe powiadomienie: ${title}`,
    title,
    intro: "W Twojej aplikacji pojawiło się nowe powiadomienie.",
    body,
    ctaText: targetUrl ? "Otwórz aplikację" : undefined,
    ctaUrl: targetUrl,
    outro: "Możesz zmienić preferencje powiadomień w Ustawieniach konta.",
  });
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || "Planner Domowy <noreply@planner.local>",
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });

    console.log("Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}

// Weryfikacja połączenia SMTP
export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error("SMTP connection error:", error);
    return false;
  }
}

