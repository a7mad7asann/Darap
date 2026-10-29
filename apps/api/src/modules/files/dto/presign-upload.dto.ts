import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { PresignUploadDto } from '@darb/contracts';

export class PresignUploadNestDto implements PresignUploadDto {
  @ApiProperty({
    description: 'Original name of the file to be uploaded',
    example: 'physics_lecture_1.pdf',
  })
  @IsString()
  @IsNotEmpty({ message: 'اسم الملف مطلوب' })
  fileName!: string;

  @ApiProperty({
    description: 'MIME type of the file (allowed: application/pdf, images, office documents)',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty({ message: 'نوع الملف مطلوب' })
  mimeType!: string;

  @ApiProperty({
    description: 'File size in bytes (maximum 25 MB)',
    example: 1048576,
  })
  @IsInt()
  @Min(1, { message: 'حجم الملف يجب أن يكون أكبر من صفر' })
  @Max(26214400, { message: 'الحد الأقصى لحجم الملف هو 25 ميجابايت' })
  byteSize!: number;
}
