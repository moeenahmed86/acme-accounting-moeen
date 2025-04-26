import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Company } from '../../db/models/Company';
import {
  TicketCategory,
  TicketStatus,
  TicketType,
  Ticket
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import { DbModule } from '../db.module';
import { TicketsController } from './tickets.controller';
import { Op } from 'sequelize';

describe('TicketsController', () => {
  let controller: TicketsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      imports: [DbModule],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  it('should be defined', async () => {
    expect(controller).toBeDefined();

    const res = await controller.findAll();
    console.log(res);
  });

  describe('create', () => {
    describe('managementReport', () => {
      it('creates managementReport ticket', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });

        expect(ticket.category).toBe(TicketCategory.accounting);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there are multiple accountants, assign the last one', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });
        const user2 = await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });

        expect(ticket.category).toBe(TicketCategory.accounting);
        expect(ticket.assigneeId).toBe(user2.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there is no accountant, throw', async () => {
        const company = await Company.create({ name: 'test' });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.managementReport,
          }),
        ).rejects.toEqual(
          new ConflictException(
            `Cannot find user with role accountant to create a ticket`,
          ),
        );
      });
    });

    describe('registrationAddressChange', () => {
      it('creates registrationAddressChange ticket', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        expect(ticket.category).toBe(TicketCategory.corporate);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there are multiple secretaries, throw', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });
        await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(
          new ConflictException(
            `Multiple users with role corporateSecretary. Cannot create a ticket`,
          ),
        );
      });

      it('if there is an existing company with registrationAddressChange ticket, throw', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(
          new ConflictException(
            'Duplication Error: existing ticket found for this company with this type Registration Address Change.',
          ),
        );
      });

      it('if create registrationAddressChange tickets for different companies, allow', async () => {
        const company1 = await Company.create({ name: 'test1' });
        await User.create({
          name: 'Secretary 1',
          role: UserRole.corporateSecretary,
          companyId: company1.id,
        });

        const company2 = await Company.create({ name: 'test2' });
        await User.create({
          name: 'Secretary 2',
          role: UserRole.corporateSecretary,
          companyId: company2.id,
        });

        const ticket1 = await controller.create({
          companyId: company1.id,
          type: TicketType.registrationAddressChange,
        });

        const ticket2 = await controller.create({
          companyId: company2.id,
          type: TicketType.registrationAddressChange,
        });

        expect(ticket1.companyId).toBe(company1.id);
        expect(ticket2.companyId).toBe(company2.id);
      });

      it('if different type of tickets created for same company, allow', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Secretary',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });
        await User.create({
          name: 'Accountant',
          role: UserRole.accountant,
          companyId: company.id,
        });

        const ticket1 = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        const ticket2 = await controller.create({
          companyId: company.id,
          type: TicketType.managementReport,
        });

        expect(ticket1.type).toBe(TicketType.registrationAddressChange);
        expect(ticket2.type).toBe(TicketType.managementReport);
      });

      it('if no corporate secretary exists, allow assigns ticket to director ', async () => {
        const company = await Company.create({ name: 'test' });
        const director = await User.create({
          name: 'Test Director',
          role: UserRole.director,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        expect(ticket.assigneeId).toBe(director.id);
      });

      it('if multiple directors exist, throws', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Director 1',
          role: UserRole.director,
          companyId: company.id,
        });
        await User.create({
          name: 'Director 2',
          role: UserRole.director,
          companyId: company.id,
        });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(
          new ConflictException(
            'Multiple users with role director. Cannot create a ticket',
          ),
        );
      });

      it('if corporate secretary and director both exist, prefers corporate secretary', async () => {
        const company = await Company.create({ name: 'test' });
        const secretary = await User.create({
          name: 'Test Secretary',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });
        await User.create({
          name: 'Test Director',
          role: UserRole.director,
          companyId: company.id,
        });

        const ticket = await controller.create({
          companyId: company.id,
          type: TicketType.registrationAddressChange,
        });

        expect(ticket.assigneeId).toBe(secretary.id);
      });

      it('if no corporate secretary or director exists, throws error', async () => {
        const company = await Company.create({ name: 'test' });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.registrationAddressChange,
          }),
        ).rejects.toEqual(
          new ConflictException(
            'Cannot find user with role director to create a ticket',
          ),
        );
      });

    });

    describe('strikeOff', () => {
      it('creates strikeOff ticket and resolves existing tickets', async () => {
        // Create a company and director
        const company = await Company.create({ name: 'test' });
        const director = await User.create({
          name: 'Test Director',
          role: UserRole.director,
          companyId: company.id,
        });

        // Create some existing tickets
        await Ticket.create({
          companyId: company.id,
          assigneeId: director.id,
          category: TicketCategory.corporate,
          type: TicketType.registrationAddressChange,
          status: TicketStatus.open,
        });

        // Create strike off ticket
        const strikeOffTicket = await controller.create({
          companyId: company.id,
          type: TicketType.strikeOff,
        });

        // Verify strike off ticket
        expect(strikeOffTicket.category).toBe(TicketCategory.management);
        expect(strikeOffTicket.assigneeId).toBe(director.id);
        expect(strikeOffTicket.status).toBe(TicketStatus.open);

        // Verify other tickets are resolved
        const existingTickets = await Ticket.findAll({
          where: {
            companyId: company.id,
            type: {
              [Op.ne]: TicketType.strikeOff,
            },
          },
        });

        existingTickets.forEach(ticket => {
          expect(ticket.status).toBe(TicketStatus.resolved);
        });
      });

      it('throws error when multiple directors exist', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Director 1',
          role: UserRole.director,
          companyId: company.id,
        });
        await User.create({
          name: 'Director 2',
          role: UserRole.director,
          companyId: company.id,
        });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.strikeOff,
          }),
        ).rejects.toEqual(
          new ConflictException(
            'Multiple directors found. Cannot create a strike off ticket',
          ),
        );
      });

      it('throws error when no director exists', async () => {
        const company = await Company.create({ name: 'test' });

        await expect(
          controller.create({
            companyId: company.id,
            type: TicketType.strikeOff,
          }),
        ).rejects.toEqual(
          new ConflictException(
            'Cannot find director to create a strike off ticket',
          ),
        );
      });
    });

  });
});
