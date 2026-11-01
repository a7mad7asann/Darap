import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  ObjectMetadataResult,
  PresignedDownloadResult,
  PresignedUploadResult,
  StorageHealthResult,
  StorageProvider,
} from './storage.provider';

export interface S3ProviderOptions {
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  uploadTtlSeconds?: number;
  downloadTtlSeconds?: number;
  providerType?: 's3' | 'r2';
}

@Injectable()
export class S3StorageProvider implements StorageProvider {
  readonly providerName: string;
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly uploadTtlSeconds: number;
  private readonly downloadTtlSeconds: number;

  constructor(configOrOptions: ConfigService | S3ProviderOptions) {
    let opts: S3ProviderOptions;

    if (configOrOptions instanceof ConfigService) {
      const providerType = (
        configOrOptions.get<string>('STORAGE_PROVIDER', 's3') || 's3'
      ).toLowerCase() as 's3' | 'r2';

      opts = {
        bucket: configOrOptions.get<string>('STORAGE_BUCKET') || '',
        region:
          configOrOptions.get<string>('STORAGE_REGION') ||
          (providerType === 'r2' ? 'auto' : 'us-east-1'),
        endpoint: configOrOptions.get<string>('STORAGE_ENDPOINT') || undefined,
        accessKeyId: configOrOptions.get<string>('STORAGE_ACCESS_KEY_ID') || '',
        secretAccessKey: configOrOptions.get<string>('STORAGE_SECRET_ACCESS_KEY') || '',
        forcePathStyle:
          configOrOptions.get<boolean>('STORAGE_FORCE_PATH_STYLE', false) ||
          configOrOptions.get<string>('STORAGE_FORCE_PATH_STYLE') === 'true',
        uploadTtlSeconds: Number(
          configOrOptions.get<number>('STORAGE_SIGNED_URL_TTL_SECONDS', 900),
        ),
        downloadTtlSeconds: 300,
        providerType,
      };
    } else {
      opts = configOrOptions;
    }

    this.providerName = opts.providerType || 's3';
    this.bucket = opts.bucket;
    this.uploadTtlSeconds = opts.uploadTtlSeconds || 900;
    this.downloadTtlSeconds = opts.downloadTtlSeconds || 300;

    this.s3Client = new S3Client({
      region: opts.region || (this.providerName === 'r2' ? 'auto' : 'us-east-1'),
      endpoint: opts.endpoint || undefined,
      credentials: {
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
      },
      forcePathStyle: opts.forcePathStyle ?? false,
    });
  }

  async generatePresignedUploadUrl(
    storageKey: string,
    mimeType: string,
    maxBytes: number,
  ): Promise<PresignedUploadResult> {
    void maxBytes;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: this.uploadTtlSeconds,
    });

    return {
      uploadUrl,
      storageKey,
      uploadTicket: 's3-direct',
      expiresInSeconds: this.uploadTtlSeconds,
    };
  }

  async generatePresignedDownloadUrl(
    storageKey: string,
    originalName: string,
  ): Promise<PresignedDownloadResult> {
    const encodedName = encodeURIComponent(originalName);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ResponseContentDisposition: `attachment; filename="${encodedName}"`,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: this.downloadTtlSeconds,
    });

    return {
      downloadUrl,
      expiresInSeconds: this.downloadTtlSeconds,
    };
  }

  async verifyObjectExists(storageKey: string, uploadTicket?: string): Promise<boolean> {
    void uploadTicket;
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404 ||
        error.code === 'NotFound'
      ) {
        return false;
      }
      this.logger.error(`Error verifying object existence for key: ${storageKey}`, error);
      throw error;
    }
  }

  async deleteObject(storageKey: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      this.logger.error(`Error deleting object key: ${storageKey}`, error);
      return false;
    }
  }

  async uploadObject(
    storageKey: string,
    body: Buffer | Uint8Array,
    mimeType: string,
  ): Promise<{ storageKey: string; byteSize: number }> {
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
    });
    await this.s3Client.send(command);
    return { storageKey, byteSize: buffer.length };
  }

  async getObjectMetadata(storageKey: string): Promise<ObjectMetadataResult> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      });
      const response = await this.s3Client.send(command);
      return {
        exists: true,
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
      };
    } catch (error: any) {
      if (
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404 ||
        error.code === 'NotFound'
      ) {
        return { exists: false };
      }
      this.logger.error(`Error fetching object metadata for key: ${storageKey}`, error);
      throw error;
    }
  }

  async checkHealth(): Promise<StorageHealthResult> {
    const start = Date.now();
    try {
      if (!this.bucket) {
        return {
          status: 'degraded',
          provider: this.providerName,
          latencyMs: Date.now() - start,
          details: { error: 'Bucket not configured' },
        };
      }

      const command = new HeadBucketCommand({ Bucket: this.bucket });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Storage health check timeout')), 3000),
      );

      await Promise.race([this.s3Client.send(command), timeoutPromise]);

      return {
        status: 'up',
        provider: this.providerName,
        latencyMs: Date.now() - start,
        details: { bucket: this.bucket },
      };
    } catch (err: any) {
      this.logger.warn(`Storage health check degraded: ${err.message}`);
      return {
        status: 'degraded',
        provider: this.providerName,
        latencyMs: Date.now() - start,
        details: { message: 'Storage connectivity degraded or inaccessible' },
      };
    }
  }
}
