// Author: Robert Massey | Created: 2026-07-13 | Module: Common / Storage
// Purpose: Blob storage behind one interface. v1 ships the LOCAL DISK driver
// (zero-dependency local dev + single-box deploys); the method surface is
// S3-shaped so an S3/R2 driver can drop in later without touching callers
// (SB backlog). Unlike enterprise (Azure presigned PUTs), uploads flow
// multipart through the API — no presign on local disk.
//
// Key layout: document-templates/{orgId}/{templateId}/original.pdf|docx
//             document-templates/{orgId}/{templateId}/converted.pdf

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';

@Injectable()
export class BlobStorageService {
  private readonly baseDir: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: SecureLoggerService,
  ) {
    this.baseDir = path.resolve(
      this.config.get<string>('STORAGE_LOCAL_DIR', path.join(process.cwd(), 'storage')),
    );
  }

  /** Local disk is always available; an S3 driver would check credentials here. */
  get configured(): boolean {
    return true;
  }

  /** Root directory used by the local-disk driver (ops console display). */
  get rootDir(): string {
    return this.baseDir;
  }

  /** Ops console probe — ensures the storage root is creatable/writable. */
  async healthCheck(): Promise<{
    state: 'up' | 'degraded' | 'down';
    detail: string;
    latencyMs: number | null;
  }> {
    const start = Date.now();
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.access(this.baseDir);
      return {
        state: 'up',
        detail: `local disk · ${this.baseDir}`,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        state: 'down',
        detail: err instanceof Error ? err.message : 'storage unreachable',
        latencyMs: Date.now() - start,
      };
    }
  }

  async upload(key: string, body: Buffer, _mimeType: string): Promise<void> {
    const filePath = this.resolveSafe(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
    this.logger.log(`blob.upload key=${key} bytes=${body.length}`, 'BlobStorageService');
  }

  download(key: string): Promise<Buffer> {
    return fs.readFile(this.resolveSafe(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolveSafe(key));
      this.logger.log(`blob.delete key=${key}`, 'BlobStorageService');
    } catch (err) {
      // Deleting a missing blob is a no-op — purge sweeps must be idempotent.
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolveSafe(key));
      return true;
    } catch {
      return false;
    }
  }

  /** Deletes every blob under a prefix (org/template teardown, purge sweep). */
  async deletePrefix(prefix: string): Promise<void> {
    const dirPath = this.resolveSafe(prefix);
    await fs.rm(dirPath, { recursive: true, force: true });
    this.logger.log(`blob.delete_prefix prefix=${prefix}`, 'BlobStorageService');
  }

  /**
   * Maps a logical key to a disk path, refusing traversal outside the base
   * dir. Keys are internal (never user-supplied verbatim), but uploads are a
   * hostile boundary — belt and braces.
   */
  private resolveSafe(key: string): string {
    // Hash-fold any suspicious segment instead of throwing: keys are built
    // from UUIDs by us, so this only trips on programmer error or tampering.
    if (key.includes('..') || path.isAbsolute(key)) {
      const digest = createHash('sha256').update(key).digest('hex');
      throw new Error(`Refusing unsafe blob key (sha256=${digest.slice(0, 16)})`);
    }
    return path.join(this.baseDir, key);
  }
}
