import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { CreateStudentDto } from '@darb/contracts';

export class CreateStudentNestDto implements CreateStudentDto {
  @ApiProperty({ example: 'student.omar' })
  @IsString()
  @IsNotEmpty({ message: 'اسم المستخدم مطلوب' })
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  username!: string;

  @ApiProperty({ example: 'StudentPass123!' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 128)
  password!: string;

  @ApiProperty({ example: 'عمر ياسر' })
  @IsString()
  @IsNotEmpty({ message: 'الاسم المعروض مطلوب' })
  @Length(2, 100)
  displayName!: string;

  @ApiProperty({ description: 'Tenant workspace UUID' })
  @IsUUID('4', { message: 'معرف مساحة العمل يجب أن يكون UUID صالح' })
  @IsNotEmpty()
  tenantId!: string;

  @ApiProperty({ example: 'الصف الثاني الثانوي', required: false })
  @IsString()
  @IsOptional()
  gradeLevel?: string;

  @ApiProperty({ example: '0501122334', required: false })
  @IsString()
  @IsOptional()
  parentPhone?: string;
}
