import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';
import { ReorderLessonsDto } from '@darb/contracts';

export class ReorderLessonsNestDto implements ReorderLessonsDto {
  @ApiProperty({
    description: 'Ordered array of lesson UUIDs reflecting the new display sequence',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsNotEmpty({ message: 'قائمة ترتيب الدروس مطلوبة' })
  @IsUUID('4', { each: true, message: 'كل عنصر يجب أن يكون معرف UUID صالح' })
  lessonIds!: string[];
}
