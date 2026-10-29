import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { EnrollmentStatus, CourseStatus, UserRole } from '@darb/contracts';
import { PrismaService } from '../../database/prisma.service';
import { StorageProvider } from './storage.provider';
import { PresignUploadNestDto } from './dto/presign-upload.dto';
import { CompleteUploadNestDto } from './dto/complete-upload.dto';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.doc',
  '.docx',
  '.txt',
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageProvider,
  ) {}

  private sanitizeFileName(original: string): string {
    const base = path.basename(original).replace(/[^a-zA-Z0-9._\-\u0600-\u06FF]/g, '_');
    return base.substring(0, 100);
  }

  async presignLessonFileUpload(
    tenantId: string,
    teacherId: string,
    lessonId: string,
    dto: PresignUploadNestDto,
    userRole: UserRole,
  ) {
    // 1. Verify lesson ownership under RLS
    await this.prisma.withTenant(tenantId, async (tx) => {
      const lesson = await tx.lesson.findFirst({
        where: { id: lessonId, deletedAt: null },
        include: { course: true },
      });

      if (!lesson) {
        throw new NotFoundException('الدرس غير موجود');
      }

      if (userRole !== UserRole.ADMIN && lesson.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بإرفاق ملفات في هذا الدرس');
      }
    });

    // 2. Validate MIME type & file size
    if (!ALLOWED_MIME_TYPES.has(dto.mimeType.toLowerCase())) {
      throw new BadRequestException(
        'نوع الملف غير مسموح به. يُسمح فقط بملفات PDF والمستندات والصور التعليمية.',
      );
    }

    const ext = path.extname(dto.fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException('امتداد الملف غير صالح أو غير مصرح به');
    }

    if (dto.byteSize > MAX_FILE_SIZE) {
      throw new BadRequestException('حجم الملف يتجاوز الحد الأقصى المسموح به (25 ميجابايت)');
    }

    // 3. Generate sanitized storage key
    const safeName = this.sanitizeFileName(dto.fileName);
    const storageKey = `tenants/${tenantId}/lessons/${lessonId}/${uuidv4()}-${safeName}`;

    // 4. Generate presigned upload URL
    const result = await this.storage.generatePresignedUploadUrl(
      storageKey,
      dto.mimeType,
      MAX_FILE_SIZE,
    );

    return {
      uploadUrl: result.uploadUrl,
      storageKey: result.storageKey,
      uploadTicket: result.uploadTicket,
      expiresInSeconds: result.expiresInSeconds,
      maxBytes: MAX_FILE_SIZE,
    };
  }

  async completeLessonFileUpload(
    tenantId: string,
    teacherId: string,
    lessonId: string,
    dto: CompleteUploadNestDto,
    userRole: UserRole,
  ) {
    // 1. Verify object exists via storage provider
    const exists = await this.storage.verifyObjectExists(dto.storageKey, dto.uploadTicket);

    if (!exists) {
      throw new BadRequestException(
        'تعذر تأكيد رفع الملف: لم يتم العثور على الملف في التخزين السحابي',
      );
    }

    return this.prisma.withTenant(tenantId, async (tx) => {
      const lesson = await tx.lesson.findFirst({
        where: { id: lessonId, deletedAt: null },
        include: { course: true },
      });

      if (!lesson) {
        throw new NotFoundException('الدرس غير موجود');
      }

      if (userRole !== UserRole.ADMIN && lesson.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بإرفاق ملفات في هذا الدرس');
      }

      // Create FileObject record
      const fileObject = await tx.fileObject.create({
        data: {
          tenantId,
          uploadedById: teacherId,
          originalName: this.sanitizeFileName(dto.fileName),
          mimeType: dto.mimeType,
          byteSize: BigInt(dto.byteSize),
          storageKey: dto.storageKey,
          isPublic: false,
        },
      });

      // Link to LessonFile
      await tx.lessonFile.create({
        data: {
          tenantId,
          lessonId,
          fileId: fileObject.id,
          orderIndex: 0,
        },
      });

      return {
        id: fileObject.id,
        originalName: fileObject.originalName,
        mimeType: fileObject.mimeType,
        byteSize: Number(fileObject.byteSize),
        createdAt: fileObject.createdAt.toISOString(),
      };
    });
  }

  async presignStudentDownload(studentId: string, fileObjectId: string) {
    return this.prisma.withBypassRls(async (tx) => {
      const file = await tx.fileObject.findFirst({
        where: { id: fileObjectId, deletedAt: null },
        include: {
          lessonFiles: {
            include: {
              lesson: {
                include: {
                  course: true,
                },
              },
            },
          },
        },
      });

      if (!file || file.lessonFiles.length === 0) {
        throw new NotFoundException('الملف المطلوب غير موجود');
      }

      const course = file.lessonFiles[0].lesson.course;

      // Check student enrollment in the course
      const enrollment = await tx.enrollment.findFirst({
        where: {
          studentId,
          courseId: course.id,
          status: EnrollmentStatus.ACTIVE,
          deletedAt: null,
        },
      });

      if (!enrollment || course.deletedAt || course.status !== CourseStatus.PUBLISHED) {
        throw new ForbiddenException(
          'غير مصرح لك بتحميل هذا الملف: لست مسجلاً في المقرر التابع له الملف',
        );
      }

      const result = await this.storage.generatePresignedDownloadUrl(
        file.storageKey,
        file.originalName,
      );

      return {
        downloadUrl: result.downloadUrl,
        fileName: file.originalName,
        mimeType: file.mimeType,
        expiresInSeconds: result.expiresInSeconds,
      };
    });
  }

  async deleteLessonFile(
    tenantId: string,
    teacherId: string,
    lessonId: string,
    fileId: string,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const lesson = await tx.lesson.findFirst({
        where: { id: lessonId, deletedAt: null },
        include: { course: true },
      });

      if (!lesson) {
        throw new NotFoundException('الدرس غير موجود');
      }

      if (userRole !== UserRole.ADMIN && lesson.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بإزالة هذا الملف');
      }

      // Remove join link
      await tx.lessonFile.deleteMany({
        where: { lessonId, fileId },
      });

      // Soft delete file object
      await tx.fileObject.updateMany({
        where: { id: fileId, tenantId },
        data: { deletedAt: new Date() },
      });

      return {
        message: 'تمت إزالة الملف بنجاح',
      };
    });
  }
}
