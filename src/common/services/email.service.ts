import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT);
    const secure = process.env.SMTP_SECURE === 'true';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMail({ to, subject, text, html }: SendEmailInput): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    await this.sendMail({
      to,
      subject: 'Redefinição de senha',
      text: 'Você solicitou a redefinição de senha.',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5">
          <h2>Redefinição de senha</h2>
          <p>Você solicitou a redefinição de senha da sua conta.</p>
          <p>Digite o código para redefiní-la</p>
          <p style="font-size: 24px; text-align: center">${token}</p>
          <p>Se você não solicitou isso, ignore este email.</p>
        </div>
      `,
    });
  }
}
