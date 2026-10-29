import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { SubmitAssignmentDto } from '@darb/contracts';

export class SubmitAssignmentNestDto implements SubmitAssignmentDto {
  @ApiProperty({
    description: 'Textual solution, answer or notes',
    example: 'تم حل كافة المسائل والنتائج مرفقة مع الخطوات الكاملة.',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(0, 10000, { message: 'النص المدخل لا يجب أن يتجاوز 10,000 حرف' })
  textContent?: string;

  @ApiProperty({
    description: 'Array of uploaded file IDs to attach to the submission',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    required: false,
  })
  @IsArray({ message: 'المرفقات يجب أن تكون مصفوفة من المعرفات' })
  @IsUUID('4', { each: true, message: 'معرف الملف المرفق يجب أن يكون بصيغة UUID صالحة' })
  @IsOptional()
  fileIds?: string[];
}
