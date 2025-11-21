import {
  Injectable,
  NotFoundException,
  Logger
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact } from './schemas/contact.schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    @InjectModel(Contact.name) private readonly contactModel: Model<Contact>
  ) {}

  async create(dto: CreateContactDto) {
    const contact = await this.contactModel.create({
      name: dto.name,
      email: dto.email,
      message: dto.message,
      read: false
    });
    this.logger.log(`New contact message created: ${contact._id}`);
    return { message: 'Contact message created successfully', contact };
  }

  async findAll() {
    const contacts = await this.contactModel
      .find()
      .sort({ createdAt: -1 })
      .lean();
    const total = contacts.length;
    const unread = contacts.filter(c => !c.read).length;
    return { contacts, total, unread };
  }

  async findOne(id: string) {
    const contact = await this.contactModel.findById(id).lean();
    if (!contact) {
      throw new NotFoundException('Contact message not found');
    }
    return contact;
  }

  async update(id: string, dto: UpdateContactDto) {
    const updateData: any = {};
    
    if (dto.read !== undefined) {
      updateData.read = dto.read;
      if (dto.read) {
        updateData.readAt = new Date();
      } else {
        updateData.readAt = null;
      }
    }

    const contact = await this.contactModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .lean();
    
    if (!contact) {
      throw new NotFoundException('Contact message not found');
    }
    
    return { message: 'Contact message updated successfully', contact };
  }

  async remove(id: string) {
    const contact = await this.contactModel.findByIdAndDelete(id).lean();
    if (!contact) {
      throw new NotFoundException('Contact message not found');
    }
    this.logger.log(`Contact message deleted: ${id}`);
    return { message: 'Contact message deleted successfully' };
  }

  async markAsRead(id: string) {
    return this.update(id, { read: true });
  }

  async markAsUnread(id: string) {
    return this.update(id, { read: false });
  }
}

