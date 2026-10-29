import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { CompleteUploadDto } from '@darb/contracts';

export class CompleteUploadNestDto implements CompleteUploadDto {
  @ApiProperty({
    description: 'Storage key returned by the presign-upload endpoint',
    example: 'tenants/uuid/lessons/uuid/uuid-file.pdf',
  })
  @IsString()
  @IsNotEmpty({ message: 'مسار التخزين مطلوب' })
  storageKey!: string;

  @ApiProperty({
    description: 'Original name of the uploaded file',
    example: 'physics_lecture_1.pdf',
  })
  @IsString()
  @IsNotEmpty({ message: 'اسم الملف مطلوب' })
  fileName!: string;

  @ApiProperty({
    description: 'MIME type of the uploaded file',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty({ message: 'نوع الملف مطلوب' })
  mimeType!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1048576,
  })
  @IsInt()
  @Min(1)
  @Max(26214400)
  byteSize!: number;

  @ApiProperty({
    description: 'Upload verification ticket returned by the presign endpoint',
    example: 'ticket-token-123',
  })
  @IsString()
  @IsNotEmpty({ message: 'رمز التحقق من الرفع مطلوب' })
  uploadTicket!: string;
}
