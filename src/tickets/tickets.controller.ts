import { Body, Controller, Get, Post } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketType,
} from '../../db/models/Ticket';
import { User } from '../../db/models/User';
import { TicketDto, newTicketDto } from './Types/Ticket.types';
import { TicketFactory } from './TicketFactory';

@Controller('api/v1/tickets')
export class TicketsController {
  @Get()
  async findAll() {
    return await Ticket.findAll({ include: [Company, User] });
  }

  @Post()
  async create(@Body() newTicketDto: newTicketDto): Promise<TicketDto> {
    const { type, companyId } = newTicketDto;
    const ticket = TicketFactory.create(type, companyId);
    return await ticket.validateAndCreate();
  }
}