import { ConflictException } from "@nestjs/common";
import { TicketCategory, TicketType, Ticket, TicketStatus } from "../../../db/models/Ticket";
import { UserRole, User } from "../../../db/models/User";
import { TicketDto } from "../Types/Ticket.types";

export abstract class BaseTicket {
  protected abstract category: TicketCategory;
  protected abstract type: TicketType;

  constructor(protected readonly companyId: number) {}

  abstract validateAndCreate(): Promise<TicketDto>;

  protected async findUsersByRole(role: UserRole): Promise<User[]> {
    return await User.findAll({
      where: { companyId: this.companyId, role },
      order: [['createdAt', 'DESC']],
    });
  }

  protected requiresSingleUser(role: UserRole): boolean {
    return role === UserRole.corporateSecretary || role === UserRole.director;
  }

  protected async validateSingleUser(users: User[], role: UserRole): Promise<void> {
    if (this.requiresSingleUser(role) && users.length > 1) {
      throw new ConflictException(
        `Multiple users with role ${role}. Cannot create a ticket`,
      );
    }
  }

  protected toTicketDto(ticket: Ticket): TicketDto {
    return {
      id: ticket.id,
      type: ticket.type,
      assigneeId: ticket.assigneeId,
      status: ticket.status,
      category: ticket.category,
      companyId: ticket.companyId,
    };
  }

  protected async createTicket(assigneeId: number): Promise<Ticket> {
    return await Ticket.create({
      companyId: this.companyId,
      assigneeId,
      category: this.category,
      type: this.type,
      status: TicketStatus.open,
    });
  }
}