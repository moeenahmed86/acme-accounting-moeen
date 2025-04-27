import { TicketType, TicketStatus, TicketCategory } from "../../../db/models/Ticket";

export interface TicketDto {
  id: number;
  type: TicketType;
  companyId: number;
  assigneeId: number;
  status: TicketStatus;
  category: TicketCategory;
}

export interface newTicketDto {
  type: TicketType;
  companyId: number;
}