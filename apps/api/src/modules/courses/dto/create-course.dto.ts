import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { CreateCourseDto } from '@darb/contracts';

export class CreateCourseNestDto implements CreateCourseDto {
  @ApiProperty({
    description: 'Course title',
    example: 'الفيزياء الحديثة للثانوية العامة',
  })
  @IsString()
  @IsNotEmpty({ message: 'عنوان المقرر مطلوب' })
  @Length(3, 120, { message: 'يجب أن يكون عنوان المقرر بين 3 و 120 حرفاً' })
  title!: string;

  @ApiProperty({
    description: 'Detailed description of the course',
    example: 'شرح مبسط لمنهج الفيزياء الحديثة وتطبيقاتها العملية',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({
    description: 'Subject name or category',
    example: 'فيزياء',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(0, 50)
  subject?: string;

  @ApiProperty({
    description: 'Target educational grade level',
    example: 'الصف الأول الثانوي',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(0, 80)
  gradeLevel?: string;
}
