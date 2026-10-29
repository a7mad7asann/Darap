import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { CreateTeacherDto } from '@darb/contracts';

export class CreateTeacherNestDto implements CreateTeacherDto {
  @ApiProperty({ example: 'teacher.samir' })
  @IsString()
  @IsNotEmpty({ message: 'اسم المستخدم مطلوب' })
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  username!: string;

  @ApiProperty({ example: 'TeacherPass123!' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 128)
  password!: string;

  @ApiProperty({ example: 'أ. سمير خليل' })
  @IsString()
  @IsNotEmpty({ message: 'الاسم المعروض مطلوب' })
  @Length(2, 100)
  displayName!: string;

  @ApiProperty({ example: 'samir@school.local', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'أكاديمية الفرسان' })
  @IsString()
  @IsNotEmpty({ message: 'اسم المدرسة أو الأكاديمية مطلوب' })
  @Length(3, 100)
  schoolName!: string;

  @ApiProperty({ example: 'al-forsan' })
  @IsString()
  @IsNotEmpty({ message: 'معرف الرابط (Slug) مطلوب' })
  @Length(3, 50)
  @Matches(/^[a-z0-9-]+$/, { message: 'يجب أن يحتوي الرابط على أحرف إنجليزية وأرقام وشرطات فقط' })
  slug!: string;

  @ApiProperty({ example: 'رياضيات', required: false })
  @IsString()
  @IsOptional()
  specialization?: string;
}
