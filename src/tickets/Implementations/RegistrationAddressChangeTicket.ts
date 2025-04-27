import { ConflictException } from "@nestjs/common";
import { TicketCategory, TicketType, Ticket } from "../../../db/models/Ticket";
import { UserRole } from "../../../db/models/User";
import { BaseTicket } from "../Base/BaseTicket";
import { TicketDto } from "../Types/Ticket.types";

export class RegistrationAddressChangeTicket extends BaseTicket {
    protected category = TicketCategory.corporate;
    protected type = TicketType.registrationAddressChange;
  
    async validateAndCreate(): Promise<TicketDto> {
      await this.validateNoDuplicateTicket();
      
      // Try corporate secretary first
      let assignees = await this.findUsersByRole(UserRole.corporateSecretary);
      await this.validateSingleUser(assignees, UserRole.corporateSecretary);
  
      // Fallback to director if no corporate secretary
      if (!assignees.length) {
        assignees = await this.findUsersByRole(UserRole.director);
        await this.validateSingleUser(assignees, UserRole.director);
        
        if (!assignees.length) {
          throw new ConflictException(
            'Cannot find user with role director to create a ticket',
          );
        }
      }
  
      const ticket = await this.createTicket(assignees[0].id);
      return this.toTicketDto(ticket);
    }
  
    private async validateNoDuplicateTicket(): Promise<void> {
      const existingTicket = await Ticket.findOne({
        where: {
          companyId: this.companyId,
          type: TicketType.registrationAddressChange,
        },
      });
  
      if (existingTicket) {
        throw new ConflictException(
          'Duplication Error: existing ticket found for this company with this type Registration Address Change.',
        );
      }
    }
  }