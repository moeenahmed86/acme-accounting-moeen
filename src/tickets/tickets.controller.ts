import { Body, ConflictException, Controller, Get, Post } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';

interface newTicketDto {
  type: TicketType;
  companyId: number;
}

interface TicketDto {
  id: number;
  type: TicketType;
  companyId: number;
  assigneeId: number;
  status: TicketStatus;
  category: TicketCategory;
}

@Controller('api/v1/tickets')
export class TicketsController {
  @Get()
  async findAll() {
    return await Ticket.findAll({ include: [Company, User] });
  }

  @Post()
  async create(@Body() newTicketDto: newTicketDto) {
    const { type, companyId } = newTicketDto;

    if (type === TicketType.strikeOff) {
      return await this.handleStrikeOffTicket(companyId);
    }

    if (type === TicketType.registrationAddressChange) {
      await this.validateDuplicateRegistrationAddressChange(companyId);
    }

    return await this.createStandardTicket(type, companyId);
  }

  private async handleStrikeOffTicket(companyId: number): Promise<TicketDto> {
    const directors = await this.findDirectors(companyId);
    if (!directors.length) {
      throw new ConflictException(
        'Cannot find director to create a strike off ticket',
      );
    }

    if (directors.length > 1) {
      throw new ConflictException(
        'Multiple directors found. Cannot create a strike off ticket',
      );
    }
    await this.resolveCompanyActiveTickets(companyId);

    const ticket = await Ticket.create({
      companyId,
      assigneeId: directors[0].id,
      category: TicketCategory.management,
      type: TicketType.strikeOff,
      status: TicketStatus.open,
    });

    return this.toTicketDto(ticket);
  }

  private async findDirectors(companyId: number): Promise<User[]> {
    return await User.findAll({
      where: { companyId, role: UserRole.director },
      order: [['createdAt', 'DESC']],
    });
  }

  private async resolveCompanyActiveTickets(companyId: number): Promise<void> {
    await Ticket.update(
      { status: TicketStatus.resolved },
      {
        where: {
          companyId,
          status: TicketStatus.open,
        },
      },
    );
  }

  private async validateDuplicateRegistrationAddressChange(companyId: number): Promise<void> {
    const existingTicket = await Ticket.findOne({
      where: {
        companyId,
        type: TicketType.registrationAddressChange,
      },
    });

    if (existingTicket) {
      throw new ConflictException(
        'Duplication Error: existing ticket found for this company with this type Registration Address Change.',
      );
    }
  }

  private async createStandardTicket(type: TicketType, companyId: number): Promise<TicketDto> {
    const category = this.determineCategory(type);
    const assignee = await this.findAssignee(type, companyId);

    const ticket = await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category,
      type,
      status: TicketStatus.open,
    });

    return this.toTicketDto(ticket);
  }

  private determineCategory(type: TicketType): TicketCategory {
    return type === TicketType.managementReport
      ? TicketCategory.accounting
      : TicketCategory.corporate;
  }

  private async findAssignee(type: TicketType, companyId: number): Promise<User> {
    let userRole = this.determineInitialUserRole(type);
    let assignees = await this.findUsersByRole(companyId, userRole);

    if (type === TicketType.registrationAddressChange && !assignees.length) {
      userRole = UserRole.director;
      assignees = await this.findUsersByRole(companyId, userRole);
    }

    if (!assignees.length) {
      throw new ConflictException(
        `Cannot find user with role ${userRole} to create a ticket`,
      );
    }

    if (this.requiresSingleUser(userRole) && assignees.length > 1) {
      throw new ConflictException(
        `Multiple users with role ${userRole}. Cannot create a ticket`,
      );
    }

    return assignees[0];
  }

  private determineInitialUserRole(type: TicketType): UserRole {
    return type === TicketType.managementReport
      ? UserRole.accountant
      : UserRole.corporateSecretary;
  }

  private async findUsersByRole(companyId: number, role: UserRole): Promise<User[]> {
    return await User.findAll({
      where: { companyId, role },
      order: [['createdAt', 'DESC']],
    });
  }

  private requiresSingleUser(role: UserRole): boolean {
    return role === UserRole.corporateSecretary || role === UserRole.director;
  }

  private toTicketDto(ticket: Ticket): TicketDto {
    return {
      id: ticket.id,
      type: ticket.type,
      assigneeId: ticket.assigneeId,
      status: ticket.status,
      category: ticket.category,
      companyId: ticket.companyId,
    };
  }
}
