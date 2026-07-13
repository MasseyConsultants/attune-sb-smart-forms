// Author: Robert Massey | Created: 2026-07-12 | Module: notifications
// Purpose: Sends transactional emails through a single nodemailer transport.
// Provider decision (S8): Resend over SMTP — smtp.resend.com:465, user
// "resend", password = the API key. One code path for Resend, Mailpit, and
// any future relay; only the connection settings differ.
// Transport priority: RESEND_API_KEY → SMTP_HOST → console stub.
// The console stub logs the full body + links so invite/reset/approval links
// are accessible in local dev without a mail relay.

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

type Transport = 'resend' | 'smtp' | 'stub';

const RESEND_SMTP_HOST = 'smtp.resend.com';
const RESEND_SMTP_PORT = 465;
const RESEND_SMTP_USER = 'resend';

@Injectable()
export class EmailService {
  private readonly transport: Transport;
  private readonly transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: SecureLoggerService,
  ) {
    const provider = (this.config.get<string>('EMAIL_PROVIDER') ?? 'resend').toLowerCase();
    const resendKey = this.config.get<string>('RESEND_API_KEY');
    const smtpHost = this.config.get<string>('SMTP_HOST');

    // EMAIL_FROM accepts the full '"Name <addr>"' form (enterprise convention)
    // or a bare address, which gets the default display name.
    const rawFrom = this.config.get<string>('EMAIL_FROM') ?? 'noreply@attuneitus.com';
    this.from = rawFrom.includes('<') ? rawFrom : `"Attune Smart Forms" <${rawFrom}>`;

    if (provider === 'resend' && resendKey) {
      this.transport = 'resend';
      this.transporter = nodemailer.createTransport({
        host: RESEND_SMTP_HOST,
        port: RESEND_SMTP_PORT,
        secure: true, // 465 is implicit TLS
        auth: { user: RESEND_SMTP_USER, pass: resendKey },
      });
      this.logger.log(`Email transport: Resend SMTP (${RESEND_SMTP_HOST})`, 'EmailService');
    } else if (smtpHost) {
      this.transport = 'smtp';
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.config.get<number>('SMTP_PORT') ?? 587,
        secure: this.config.get<boolean>('SMTP_SECURE') ?? false,
        auth: this.config.get<string>('SMTP_USER')
          ? {
              user: this.config.get<string>('SMTP_USER'),
              pass: this.config.get<string>('SMTP_PASS'),
            }
          : undefined,
      });
      this.logger.log(`Email transport: SMTP (${smtpHost})`, 'EmailService');
    } else {
      this.transport = 'stub';
      this.logger.warn(
        'Email transport: STUB — no RESEND_API_KEY or SMTP_HOST configured. ' +
          'Emails will be logged to console only.',
        'EmailService',
      );
    }
  }

  /** Resolved transport so callers can guard against stub mode. */
  get transportType(): Transport {
    return this.transport;
  }

  async send(payload: EmailPayload): Promise<void> {
    if (!this.transporter) {
      this.logStub(payload);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text ?? payload.html.replace(/<[^>]+>/g, ''),
        attachments: payload.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
    } catch (err) {
      const toLabel = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to;
      this.logger.error(
        `Failed to send email to ${toLabel}: ${String(err)}`,
        undefined,
        'EmailService',
      );
      throw err;
    }
  }

  private logStub(payload: EmailPayload): void {
    const body = payload.text ?? payload.html.replace(/<[^>]+>/g, '');
    // Stripping tags also strips hrefs — surface them so actionable links
    // (approval decisions, invites) stay clickable when developing locally.
    const links = [...payload.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    const linksBlock = links.length > 0 ? `\n  Links:\n    ${links.join('\n    ')}` : '';
    this.logger.log(
      `[STUB] Email NOT sent (no RESEND_API_KEY or SMTP_HOST).\n` +
        `  To:      ${payload.to}\n` +
        `  Subject: ${payload.subject}\n` +
        `  Body:\n${body}${linksBlock}`,
      'EmailService',
    );
  }
}
