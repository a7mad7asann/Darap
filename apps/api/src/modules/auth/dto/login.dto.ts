import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { LoginRequestDto } from '@darb/contracts';

export class LoginDto implements LoginRequestDto {
  @ApiProperty({
    description: 'Username for authentication (alphanumeric, dots, underscores, dashes)',
    example: 'teacher1',
  })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @Length(3, 50, { message: 'Username must be between 3 and 50 characters' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Username may only contain letters, numbers, dots, underscores, and hyphens',
  })
  username!: string;

  @ApiProperty({
    description: 'User account password',
    example: 'Teacher123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @Length(6, 128, { message: 'Password must be between 6 and 128 characters' })
  password!: string;
}
