import nodemailer from "nodemailer";

// Konfiguracja transportera email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
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

