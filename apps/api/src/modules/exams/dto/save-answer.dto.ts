import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { SaveAnswerDto } from '@darb/contracts';

export class SaveAnswerNestDto implements SaveAnswerDto {
  @ApiProperty({
    description: 'Question UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'معرف السؤال يجب أن يكون بصيغة UUID صالحة' })
  @IsNotEmpty({ message: 'معرف السؤال مطلوب' })
  questionId!: string;

  @ApiProperty({
    description: 'Selected Option UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID('4', { message: 'معرف الخيار المحدد يجب أن يكون بصيغة UUID صالحة' })
  @IsNotEmpty({ message: 'معرف الخيار مطلوب' })
  selectedOptionId!: string;
}
