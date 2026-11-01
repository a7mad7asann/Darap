import * as http from 'http';
import { AddressInfo } from 'net';
import { S3StorageProvider } from './s3-storage.provider';

describe('S3StorageProvider Integration Tests (Real HTTP S3-compatible Server)', () => {
  let server: http.Server;
  let serverUrl: string;
  const objectStore = new Map<string, { body: Buffer; contentType: string }>();

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const pathParts = url.pathname.replace(/^\//, '').split('/');
      const bucket = pathParts[0];
      const key = pathParts.slice(1).join('/');
      const storeKey = `${bucket}/${key}`;

      if (req.method === 'PUT') {
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          const body = Buffer.concat(chunks);
          objectStore.set(storeKey, {
            body,
            contentType: (req.headers['content-type'] as string) || 'application/octet-stream',
          });
          res.writeHead(200, { ETag: '"mock-etag-999"' });
          res.end();
        });
      } else if (req.method === 'GET') {
        const item = objectStore.get(storeKey);
        if (!item) {
          res.writeHead(404, { 'Content-Type': 'application/xml' });
          res.end(
            '<Error><Code>NoSuchKey</Code><Message>The specified key does not exist.</Message></Error>',
          );
          return;
        }
        res.writeHead(200, {
          'Content-Type': item.contentType,
          'Content-Length': item.body.length.toString(),
        });
        res.end(item.body);
      } else if (req.method === 'HEAD') {
        const item = objectStore.get(storeKey);
        if (!item) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.writeHead(200, {
          'Content-Type': item.contentType,
          'Content-Length': item.body.length.toString(),
          'Last-Modified': new Date().toUTCString(),
        });
        res.end();
      } else if (req.method === 'DELETE') {
        objectStore.delete(storeKey);
        res.writeHead(204);
        res.end();
      } else {
        res.writeHead(405);
        res.end();
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      serverUrl = `http://127.0.0.1:${addr.port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    objectStore.clear();
  });

  it('1. should upload an object over real HTTP and verify it exists', async () => {
    const provider = new S3StorageProvider({
      bucket: 'test-bucket',
      endpoint: serverUrl,
      region: 'us-east-1',
      accessKeyId: 'test-access-key-id',
      secretAccessKey: 'test-secret-access-key-1234567890',
      forcePathStyle: true,
      uploadTtlSeconds: 300,
      downloadTtlSeconds: 300,
      providerType: 's3',
    });

    const fileContent = Buffer.from('PDF Content for Testing DARB S3 Integration');
    const uploadRes = await provider.uploadObject(
      'lessons/physics/worksheet1.pdf',
      fileContent,
      'application/pdf',
    );

    expect(uploadRes.storageKey).toBe('lessons/physics/worksheet1.pdf');
    expect(uploadRes.byteSize).toBe(fileContent.length);

    const exists = await provider.verifyObjectExists('lessons/physics/worksheet1.pdf');
    expect(exists).toBe(true);
  });

  it('2. should retrieve object metadata via HeadObject over real HTTP', async () => {
    const provider = new S3StorageProvider({
      bucket: 'test-bucket',
      endpoint: serverUrl,
      region: 'us-east-1',
      accessKeyId: 'test-access-key-id',
      secretAccessKey: 'test-secret-access-key-1234567890',
      forcePathStyle: true,
    });

    const fileContent = Buffer.from('Image Content Data 123456');
    await provider.uploadObject('images/diagram.png', fileContent, 'image/png');

    const metadata = await provider.getObjectMetadata('images/diagram.png');
    expect(metadata.exists).toBe(true);
    expect(metadata.contentLength).toBe(fileContent.length);
    expect(metadata.contentType).toBe('image/png');

    const nonExistent = await provider.getObjectMetadata('non-existent.txt');
    expect(nonExistent.exists).toBe(false);
  });

  it('3. should generate signed upload URL and accept client direct PUT upload', async () => {
    const provider = new S3StorageProvider({
      bucket: 'test-bucket',
      endpoint: serverUrl,
      region: 'us-east-1',
      accessKeyId: 'test-access-key-id',
      secretAccessKey: 'test-secret-access-key-1234567890',
      forcePathStyle: true,
      uploadTtlSeconds: 600,
    });

    const presigned = await provider.generatePresignedUploadUrl(
      'submissions/student1/essay.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      10 * 1024 * 1024,
    );

    expect(presigned.uploadUrl).toContain(serverUrl);
    expect(presigned.uploadUrl).toContain('X-Amz-Signature');
    expect(presigned.storageKey).toBe('submissions/student1/essay.docx');
    expect(presigned.expiresInSeconds).toBe(600);

    // Simulate direct browser upload via fetch
    const fileBytes = Buffer.from('Word document content bytes');
    const directUploadRes = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      body: fileBytes,
    });

    expect(directUploadRes.ok).toBe(true);

    const exists = await provider.verifyObjectExists('submissions/student1/essay.docx');
    expect(exists).toBe(true);
  });

  it('4. should generate signed download URL and allow client GET download', async () => {
    const provider = new S3StorageProvider({
      bucket: 'test-bucket',
      endpoint: serverUrl,
      region: 'us-east-1',
      accessKeyId: 'test-access-key-id',
      secretAccessKey: 'test-secret-access-key-1234567890',
      forcePathStyle: true,
      downloadTtlSeconds: 180,
    });

    const content = Buffer.from('Worksheet download content');
    await provider.uploadObject('courses/physics/worksheet.pdf', content, 'application/pdf');

    const presignedDownload = await provider.generatePresignedDownloadUrl(
      'courses/physics/worksheet.pdf',
      'ورقة عمل الفيزياء.pdf',
    );

    expect(presignedDownload.downloadUrl).toContain(serverUrl);
    expect(presignedDownload.downloadUrl).toContain('X-Amz-Signature');
    expect(presignedDownload.expiresInSeconds).toBe(180);

    // Execute direct client GET request
    const downloadRes = await fetch(presignedDownload.downloadUrl);
    expect(downloadRes.ok).toBe(true);
    const downloadedBytes = Buffer.from(await downloadRes.arrayBuffer());
    expect(downloadedBytes.equals(content)).toBe(true);
  });

  it('5. should delete an object over real HTTP and confirm it is gone', async () => {
    const provider = new S3StorageProvider({
      bucket: 'test-bucket',
      endpoint: serverUrl,
      region: 'us-east-1',
      accessKeyId: 'test-access-key-id',
      secretAccessKey: 'test-secret-access-key-1234567890',
      forcePathStyle: true,
    });

    await provider.uploadObject('temp/to-delete.pdf', Buffer.from('Delete me'), 'application/pdf');
    expect(await provider.verifyObjectExists('temp/to-delete.pdf')).toBe(true);

    const deleteSuccess = await provider.deleteObject('temp/to-delete.pdf');
    expect(deleteSuccess).toBe(true);

    const existsAfterDelete = await provider.verifyObjectExists('temp/to-delete.pdf');
    expect(existsAfterDelete).toBe(false);
  });

  it('6. should support Cloudflare R2 provider configuration', () => {
    const provider = new S3StorageProvider({
      bucket: 'r2-bucket-name',
      endpoint: 'https://test-account-id.r2.cloudflarestorage.com',
      region: 'auto',
      accessKeyId: 'r2-token-access-key',
      secretAccessKey: 'r2-token-secret-key-1234567890',
      providerType: 'r2',
    });

    expect(provider.providerName).toBe('r2');
  });
});
