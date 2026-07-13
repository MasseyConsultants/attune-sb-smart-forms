// Author: Robert Massey | Created: 2026-07-12 | Module: notifications
// Purpose: Sends transactional emails via Resend (preferred) or nodemailer SMTP (fallback).
// Transport priority: RESEND_API_KEY → SMTP_HOST → console stub.
// The console stub logs the full body so invite/reset links are accessible without a mail relay.
// Ported from the enterprise edition.

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

@Injectable()
export class EmailService {
  private readonly transport: Transport;
  private readonly resendApiKey: string;
  private readonly resendFrom: string;
  private readonly smtpTransporter: nodemailer.Transporter | null = null;
  private readonly smtpFrom: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: SecureLoggerService,
  ) {
    const resendKey = this.config.get<string>('RESEND_API_KEY');
    const smtpHost = this.config.get<string>('SMTP_HOST');
    const fromEmail = this.config.get<string>('RESEND_FROM_EMAIL') ?? 'noreply@attuneitus.com';
    const fromName = this.config.get<string>('RESEND_FROM_NAME') ?? 'Attune Smart Forms';

    this.resendApiKey = resendKey ?? '';
    this.resendFrom = `"${fromName}" <${fromEmail}>`;
    this.smtpFrom = this.config.get<string>('SMTP_FROM') ?? fromEmail;

    if (resendKey) {
      this.transport = 'resend';
      this.logger.log('Email transport: Resend HTTP API', 'EmailService');
    } else if (smtpHost) {
      this.transport = 'smtp';
      this.smtpTransporter = nodemailer.createTransport({
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
    try {
      if (this.transport === 'resend') {
        await this.sendViaResend(payload);
      } else if (this.transport === 'smtp' && this.smtpTransporter) {
        await this.smtpTransporter.sendMail({
          from: this.smtpFrom,
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
      } else {
        this.logStub(payload);
      }
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

  private async sendViaResend(payload: EmailPayload): Promise<void> {
    const body: Record<string, unknown> = {
      from: this.resendFrom,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text ?? payload.html.replace(/<[^>]+>/g, ''),
    };

    if (payload.attachments && payload.attachments.length > 0) {
      body['attachments'] = payload.attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content)
          ? a.content.toString('base64')
          : Buffer.from(a.content).toString('base64'),
      }));
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.resendApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      interface ResendError {
        message?: string;
        name?: string;
      }
      const err = (await res.json().catch(() => ({}))) as ResendError;
      throw new Error(`Resend API error ${res.status}: ${err.message ?? err.name ?? 'unknown'}`);
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
