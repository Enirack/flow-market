import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Envoi d'emails transactionnels. Tant que SMTP_HOST est vide (mode dev par
 * defaut, meme logique que PAYMENT_PROVIDER_MODE=mock pour les paiements),
 * aucun serveur SMTP n'est appele : l'email est simplement logge. Un echec
 * d'envoi ne remonte jamais d'exception a l'appelant - un email qui ne part
 * pas ne doit jamais casser le flux metier auquel il est attache.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | undefined;
  private readonly from: string;

  constructor() {
    this.from = process.env.MAIL_FROM || 'FlowMarket <no-reply@flowmarket.dev>';

    const host = process.env.SMTP_HOST;
    if (host) {
      this.transporter = createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      });
    }
  }

  async sendMail(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[DEV] "${message.subject}" pour ${message.to} (aucun email envoyé, SMTP_HOST non configuré)`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
    } catch (error) {
      this.logger.error(`Échec d'envoi email à ${message.to}: ${(error as Error).message}`);
    }
  }
}
