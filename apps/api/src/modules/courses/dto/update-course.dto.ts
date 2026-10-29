import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { UpdateCourseDto } from '@darb/contracts';

export class UpdateCourseNestDto implements UpdateCourseDto {
  @ApiProperty({
    description: 'Updated course title',
    example: 'الفيزياء المتقدمة - القسم الأول',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(3, 120, { message: 'يجب أن يكون عنوان المقرر بين 3 و 120 حرفاً' })
  title?: string;

  @ApiProperty({
    description: 'Updated course description',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({
    description: 'Updated course subject',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(0, 50)
  subject?: string;

  @ApiProperty({
    description: 'Updated grade level',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(0, 80)
  gradeLevel?: string;
}
