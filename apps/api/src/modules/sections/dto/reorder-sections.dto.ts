import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { ReorderSectionsDto } from '@darb/contracts';

export class ReorderSectionsNestDto implements ReorderSectionsDto {
  @ApiProperty({
    description: 'قائمة بمعرفات الأقسام بالترتيب الجديد المطلوب',
    type: [String],
    example: ['d3b07384-d113-46fb-a00d-5d9c2a3e5d01', 'e2a07384-d113-46fb-a00d-5d9c2a3e5d02'],
  })
  @IsArray({ message: 'يجب تقديم قائمة من المعرفات' })
  @ArrayNotEmpty({ message: 'قائمة المعرفات لا يمكن أن تكون فارغة' })
  @IsUUID('4', { each: true, message: 'كل عنصر يجب أن يكون UUID صالح' })
  sectionIds: string[];
}
