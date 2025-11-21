import { ApiProperty } from '@nestjs/swagger';

export class ContactResponseDto {
  @ApiProperty({
    description: 'Contact message ID',
    example: '507f1f77bcf86cd799439011'
  })
  _id!: string;

  @ApiProperty({
    description: 'Name of the contact',
    example: 'John Doe'
  })
  name!: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com'
  })
  email!: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I would like to know more about your services.'
  })
  message!: string;

  @ApiProperty({
    description: 'Whether the message has been read',
    example: false
  })
  read!: boolean;

  @ApiProperty({
    description: 'Date when message was read',
    example: '2024-01-15T10:30:00.000Z',
    required: false
  })
  readAt?: Date;

  @ApiProperty({
    description: 'Date when message was created',
    example: '2024-01-15T10:00:00.000Z'
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date when message was last updated',
    example: '2024-01-15T10:30:00.000Z'
  })
  updatedAt!: Date;
}

export class ContactCreateResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Contact message created successfully'
  })
  message!: string;

  @ApiProperty({
    description: 'Created contact message',
    type: ContactResponseDto
  })
  contact!: ContactResponseDto;
}

export class ContactListResponseDto {
  @ApiProperty({
    description: 'List of contact messages',
    type: [ContactResponseDto]
  })
  contacts!: ContactResponseDto[];

  @ApiProperty({
    description: 'Total count of messages',
    example: 10
  })
  total!: number;

  @ApiProperty({
    description: 'Count of unread messages',
    example: 3
  })
  unread!: number;
}

