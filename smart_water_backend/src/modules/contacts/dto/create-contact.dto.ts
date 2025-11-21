import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, MaxLength, MinLength } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({
    description: 'Name of the contact',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Email address of the contact',
    example: 'john.doe@example.com'
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I would like to know more about your services.',
    minLength: 10,
    maxLength: 2000
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;
}

