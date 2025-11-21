import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBearerAuth
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import {
  ContactResponseDto,
  ContactCreateResponseDto,
  ContactListResponseDto
} from './dto/contact-response.dto';

@ApiTags('contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @ApiOperation({
    summary: 'Create a new contact message',
    description: 'Public endpoint to submit a contact form. No authentication required.'
  })
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: 201,
    description: 'Contact message created successfully',
    type: ContactCreateResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @ApiOperation({
    summary: 'Get all contact messages',
    description: 'Retrieve all contact messages. Admin only.'
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'List of contact messages retrieved successfully',
    type: ContactListResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  async findAll() {
    return this.contactsService.findAll();
  }

  @ApiOperation({
    summary: 'Get contact message by ID',
    description: 'Retrieve a specific contact message by its ID. Admin only.'
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Contact message ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({
    status: 200,
    description: 'Contact message retrieved successfully',
    type: ContactResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  @ApiResponse({ status: 404, description: 'Contact message not found' })
  async findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update contact message',
    description: 'Update contact message (mark as read/unread). Admin only.'
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Contact message ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({
    status: 200,
    description: 'Contact message updated successfully',
    type: ContactResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  @ApiResponse({ status: 404, description: 'Contact message not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @ApiOperation({
    summary: 'Mark contact message as read',
    description: 'Mark a contact message as read. Admin only.'
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Contact message ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({
    status: 200,
    description: 'Contact message marked as read',
    type: ContactResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  @ApiResponse({ status: 404, description: 'Contact message not found' })
  async markAsRead(@Param('id') id: string) {
    return this.contactsService.markAsRead(id);
  }

  @ApiOperation({
    summary: 'Mark contact message as unread',
    description: 'Mark a contact message as unread. Admin only.'
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/unread')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Contact message ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({
    status: 200,
    description: 'Contact message marked as unread',
    type: ContactResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  @ApiResponse({ status: 404, description: 'Contact message not found' })
  async markAsUnread(@Param('id') id: string) {
    return this.contactsService.markAsUnread(id);
  }

  @ApiOperation({
    summary: 'Delete contact message',
    description: 'Delete a contact message. Admin only.'
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Contact message ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({
    status: 200,
    description: 'Contact message deleted successfully'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  @ApiResponse({ status: 404, description: 'Contact message not found' })
  async remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}

