export interface PresignUploadDto {
  fileName: string;
  mimeType: string;
  byteSize: number;
}

export type PresignUploadRequestDto = PresignUploadDto;

export interface PresignUploadResponseDto {
  uploadUrl: string;
  storageKey: string;
  uploadTicket: string;
  expiresInSeconds: number;
  maxBytes: number;
}

export interface CompleteUploadDto {
  storageKey: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  uploadTicket: string;
}

export type CompleteUploadRequestDto = CompleteUploadDto;

export interface FileSummaryDto {
  id: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
}

export interface PresignDownloadResponseDto {
  downloadUrl: string;
  fileName: string;
  mimeType: string;
  expiresInSeconds: number;
}
