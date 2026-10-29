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

export abstract class StorageProvider {
  abstract generatePresignedUploadUrl(
    storageKey: string,
    mimeType: string,
    maxBytes: number,
  ): Promise<PresignedUploadResult>;

  abstract generatePresignedDownloadUrl(
    storageKey: string,
    originalName: string,
  ): Promise<PresignedDownloadResult>;

  abstract verifyObjectExists(storageKey: string, uploadTicket: string): Promise<boolean>;

  abstract deleteObject(storageKey: string): Promise<boolean>;
}
