import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PresignedDownloadResult,
  PresignedUploadResult,
  StorageProvider,
} from './storage.provider';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly pendingTickets = new Map<string, { storageKey: string; expiresAt: number }>();

  async generatePresignedUploadUrl(
    storageKey: string,
    mimeType: string,
    maxBytes: number,
  ): Promise<PresignedUploadResult> {
    void mimeType;
    void maxBytes;
    const uploadTicket = crypto.randomBytes(24).toString('hex');
    const expiresInSeconds = 900; // 15 minutes
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    this.pendingTickets.set(uploadTicket, { storageKey, expiresAt });

    // In a managed S3 provider, this would be an S3 presigned PUT URL.
    // In local development / pilot sandbox, this is a mock direct upload endpoint or presigned ticket.
    const uploadUrl = `https://storage.local.darb/upload/${storageKey}?ticket=${uploadTicket}`;

    return {
      uploadUrl,
      storageKey,
      uploadTicket,
      expiresInSeconds,
    };
  }

  async generatePresignedDownloadUrl(
    storageKey: string,
    originalName: string,
  ): Promise<PresignedDownloadResult> {
    const downloadTicket = crypto.randomBytes(24).toString('hex');
    const expiresInSeconds = 300; // 5 minutes

    const encodedName = encodeURIComponent(originalName);
    const downloadUrl = `https://storage.local.darb/download/${storageKey}?ticket=${downloadTicket}&name=${encodedName}`;

    return {
      downloadUrl,
      expiresInSeconds,
    };
  }

  async verifyObjectExists(storageKey: string, uploadTicket: string): Promise<boolean> {
    const ticket = this.pendingTickets.get(uploadTicket);
    if (!ticket) {
      return false;
    }

    if (Date.now() > ticket.expiresAt || ticket.storageKey !== storageKey) {
      this.pendingTickets.delete(uploadTicket);
      return false;
    }

    this.pendingTickets.delete(uploadTicket);
    return true;
  }

  async deleteObject(storageKey: string): Promise<boolean> {
    this.logger.log(`Mock object storage deleted key: ${storageKey}`);
    return true;
  }
}
