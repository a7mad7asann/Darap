import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CreateSectionDto } from '@darb/contracts';

export class CreateSectionNestDto implements CreateSectionDto {
  @ApiProperty({
    description: 'عنوان الوحدة أو القسم التعليمي',
    example: 'الوحدة الأولى: الميكانيكا الكلاسيكية',
  })
  @IsString()
  @IsNotEmpty({ message: 'عنوان القسم مطلوب' })
  @MaxLength(200, { message: 'يجب ألا يتجاوز عنوان القسم 200 حرف' })
  title: string;

  @ApiPropertyOptional({
    description: 'وصف اختياري للقسم',
    example: 'تغطي هذه الوحدة قوانين نيوتن وتطبيقاتها',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'يجب ألا يتجاوز وصف القسم 1000 حرف' })
  description?: string;

  @ApiPropertyOptional({ description: 'ترتيب العرض', example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
