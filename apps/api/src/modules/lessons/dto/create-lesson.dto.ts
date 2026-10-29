import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';
import { CreateLessonDto } from '@darb/contracts';

export class CreateLessonNestDto implements CreateLessonDto {
  @ApiProperty({
    description: 'Lesson title',
    example: 'المحاضرة الأولى: قانون أوم والمقاومة النوعية',
  })
  @IsString()
  @IsNotEmpty({ message: 'عنوان الدرس مطلوب' })
  @Length(2, 150, { message: 'يجب أن يكون عنوان الدرس بين 2 و 150 حرفاً' })
  title!: string;

  @ApiProperty({
    description: 'Lesson body or lecture notes in text/markdown',
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: 'Display order sequence number',
    example: 0,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;
}
