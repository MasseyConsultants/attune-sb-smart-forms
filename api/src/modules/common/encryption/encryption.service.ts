// Author: Robert Massey | Created: 2026-07-12 | Module: common/encryption
// Purpose: AES-256-GCM symmetric encryption for stored third-party credentials.
// Key must be a 32-byte hex string in ENCRYPTION_KEY env var.
// Each encryption call generates a random 12-byte IV and returns IV:authTag:ciphertext.
// Ported verbatim from the enterprise edition.

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: SecureLoggerService,
  ) {
    const hex = this.config.get<string>('ENCRYPTION_KEY');
    if (!hex || hex.length !== 64) {
      // Fail hard in production — a missing or short key must never encrypt real secrets.
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new Error(
          'ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Refusing to start without a valid key in production.',
        );
      }
      this.logger.error(
        'ENCRYPTION_KEY missing or invalid — using test-only zero key. DO NOT use in production.',
        undefined,
        'EncryptionService',
      );
      this.key = Buffer.from('0'.repeat(64), 'hex');
    } else {
      this.key = Buffer.from(hex, 'hex');
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Format: iv_hex:tag_hex:ciphertext_hex
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted credential format');
    }
    const [ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');

    if (iv.length !== IV_BYTES || tag.length !== AUTH_TAG_BYTES) {
      throw new Error('Invalid IV or auth tag length');
    }

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
