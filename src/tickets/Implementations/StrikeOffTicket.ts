import { ConflictException } from "@nestjs/common";
import { TicketCategory, TicketType, Ticket, TicketStatus } from "../../../db/models/Ticket";
import { UserRole } from "../../../db/models/User";
import { BaseTicket } from "../Base/BaseTicket";
import { TicketDto } from "../Types/Ticket.types";

export class StrikeOffTicket extends BaseTicket {
    protected category = TicketCategory.management;
    protected type = TicketType.strikeOff;
  
    async validateAndCreate(): Promise<TicketDto> {
      const directors = await this.findUsersByRole(UserRole.director);
      
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
  
      await this.resolveCompanyActiveTickets();
      
      const ticket = await this.createTicket(directors[0].id);
      return this.toTicketDto(ticket);
    }
  
    private async resolveCompanyActiveTickets(): Promise<void> {
      await Ticket.update(
        { status: TicketStatus.resolved },
        {
          where: {
            companyId: this.companyId,
            status: TicketStatus.open,
          },
        },
      );
    }
  }