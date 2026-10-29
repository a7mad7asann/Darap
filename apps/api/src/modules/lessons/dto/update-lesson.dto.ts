import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { UpdateLessonDto } from '@darb/contracts';

export class UpdateLessonNestDto implements UpdateLessonDto {
  @ApiProperty({
    description: 'Updated lesson title',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(2, 150)
  title?: string;

  @ApiProperty({
    description: 'Updated lesson body content',
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: 'Updated display order index',
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;

  @ApiProperty({
    description: 'Updated Section/Unit ID this lesson belongs to (null to detach)',
    required: false,
  })
  @IsString()
  @IsOptional()
  sectionId?: string | null;
}
