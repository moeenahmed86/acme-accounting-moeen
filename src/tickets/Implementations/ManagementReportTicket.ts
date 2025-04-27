import { TicketCategory, TicketType, Ticket } from '../../../db/models/Ticket';
import { UserRole } from '../../../db/models/User';
import { TicketDto } from '../Types/Ticket.types';
import { BaseTicket } from '../Base/BaseTicket';
import { ConflictException } from '@nestjs/common/exceptions';

export class ManagementReportTicket extends BaseTicket {
  protected category = TicketCategory.accounting;
  protected type = TicketType.managementReport;

  async validateAndCreate(): Promise<TicketDto> {
    const accountants = await this.findUsersByRole(UserRole.accountant);
    
    if (!accountants.length) {
      throw new ConflictException(
        'Cannot find user with role accountant to create a ticket',
      );
    }

    const ticket = await this.createTicket(accountants[0].id);
    return this.toTicketDto(ticket);
  }
}