import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { UpdateSectionDto } from '@darb/contracts';

export class UpdateSectionNestDto implements UpdateSectionDto {
  @ApiPropertyOptional({
    description: 'عنوان الوحدة أو القسم التعليمي',
    example: 'الوحدة الأولى: الميكانيكا المتقدمة',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'يجب ألا يتجاوز عنوان القسم 200 حرف' })
  title?: string;

  @ApiPropertyOptional({ description: 'وصف اختياري للقسم' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'يجب ألا يتجاوز وصف القسم 1000 حرف' })
  description?: string;

  @ApiPropertyOptional({ description: 'ترتيب العرض' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
