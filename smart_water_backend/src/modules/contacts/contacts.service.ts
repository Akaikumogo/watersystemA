import {
  Injectable,
  NotFoundException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './schemas/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { toApiDoc } from '../../common/utils/mongo-compat';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    @InjectRepository(Contact) private readonly contactRepo: Repository<Contact>
  ) {}

  async create(dto: CreateContactDto) {
    const contact = await this.contactRepo.save(
      this.contactRepo.create({
        name: dto.name,
        email: dto.email,
        message: dto.message,
        read: false
      })
    );
    this.logger.log(`New contact message created: ${contact.id}`);
    return {
      message: 'Contact message created successfully',
      contact: toApiDoc(contact as unknown as Record<string, unknown>)
    };
  }

  async findAll() {
    const contacts = await this.contactRepo.find({
      order: { createdAt: 'DESC' }
    });
    const plain = contacts.map((c) => toApiDoc(c as unknown as Record<string, unknown>));
    const total = plain.length;
    const unread = plain.filter((c) => !c.read).length;
    return { contacts: plain, total, unread };
  }

  async findOne(id: string) {
    const contact = await this.contactRepo.findOne({ where: { id } });
    if (!contact) {
      throw new NotFoundException('Contact message not found');
    }
    return toApiDoc(contact as unknown as Record<string, unknown>);
  }

  async update(id: string, dto: UpdateContactDto) {
    const contact = await this.contactRepo.findOne({ where: { id } });
    if (!contact) {
      throw new NotFoundException('Contact message not found');
    }

    if (dto.read !== undefined) {
      contact.read = dto.read;
      contact.readAt = dto.read ? new Date() : null;
    }

    const saved = await this.contactRepo.save(contact);

    return {
      message: 'Contact message updated successfully',
      contact: toApiDoc(saved as unknown as Record<string, unknown>)
    };
  }

  async remove(id: string) {
    const res = await this.contactRepo.delete({ id });
    if (!res.affected) {
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
