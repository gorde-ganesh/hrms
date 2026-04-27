import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordReset(to: string, token: string): Promise<void> {
  const appUrl = process.env.APP_URL ?? 'http://localhost:4200';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'noreply@hrms.local',
      to,
      subject: 'Password Reset Request',
      html: `
        <p>You requested a password reset for your HRMS account.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link expires in 24 hours. If you did not request this, ignore this email.</p>
      `,
    });
  } catch (err) {
    logger.error('Failed to send password reset email:', err);
    throw new Error('Email delivery failed. Please try again later.');
  }
}
