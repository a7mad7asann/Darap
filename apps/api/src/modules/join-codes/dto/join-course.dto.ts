import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { JoinCourseDto } from '@darb/contracts';

export class JoinCourseNestDto implements JoinCourseDto {
  @ApiProperty({
    description: 'High-entropy alphanumeric join code provided by teacher',
    example: 'DARB-A1B2-C3D4-E5F6',
  })
  @IsString()
  @IsNotEmpty({ message: 'رمز الانضمام مطلوب' })
  @Length(6, 32, { message: 'رمز الانضمام غير صالح' })
  @Matches(/^[A-Za-z0-9-]+$/, { message: 'تنسيق رمز الانضمام غير صحيح' })
  code!: string;
}
