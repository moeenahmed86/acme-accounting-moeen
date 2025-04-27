import { BaseTicket } from "./Base/BaseTicket";
import { ManagementReportTicket } from "./Implementations/ManagementReportTicket";
import { StrikeOffTicket } from "./Implementations/StrikeOffTicket";
import { RegistrationAddressChangeTicket } from "./Implementations/RegistrationAddressChangeTicket";
import { TicketType } from "../../db/models/Ticket";

export class TicketFactory {
    static create(type: TicketType, companyId: number): BaseTicket {
      switch (type) {
        case TicketType.managementReport:
          return new ManagementReportTicket(companyId);
        case TicketType.registrationAddressChange:
          return new RegistrationAddressChangeTicket(companyId);
        case TicketType.strikeOff:
          return new StrikeOffTicket(companyId);
        default:
          throw new Error(`Unsupported ticket type: ${type}`);
      }
    }
  }