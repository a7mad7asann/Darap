export interface PresignedUploadResult {
  uploadUrl: string;
  storageKey: string;
  uploadTicket: string;
  expiresInSeconds: number;
}

export interface PresignedDownloadResult {
  downloadUrl: string;
  expiresInSeconds: number;
}

export interface ObjectMetadataResult {
  exists: boolean;
  contentLength?: number;
  contentType?: string;
  lastModified?: Date;
}

export interface StorageHealthResult {
  status: 'up' | 'degraded' | 'down';
  provider: string;
  latencyMs: number;
  details?: Record<string, unknown>;
}

export abstract class StorageProvider {
  abstract readonly providerName: string;

  abstract generatePresignedUploadUrl(
    storageKey: string,
    mimeType: string,
    maxBytes: number,
  ): Promise<PresignedUploadResult>;

  abstract generatePresignedDownloadUrl(
    storageKey: string,
    originalName: string,
  ): Promise<PresignedDownloadResult>;

  abstract verifyObjectExists(storageKey: string, uploadTicket?: string): Promise<boolean>;

  abstract deleteObject(storageKey: string): Promise<boolean>;

  abstract uploadObject(
    storageKey: string,
    body: Buffer | Uint8Array,
    mimeType: string,
  ): Promise<{ storageKey: string; byteSize: number }>;

  abstract getObjectMetadata(storageKey: string): Promise<ObjectMetadataResult>;

  abstract checkHealth(): Promise<StorageHealthResult>;
}
