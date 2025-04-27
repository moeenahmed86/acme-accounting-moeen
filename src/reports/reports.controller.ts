import { Controller, Get, Post, HttpCode, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('accounts')
  async generateAccounts() {
    return await this.reportsService.accounts();
  }

  @Get('yearly')
  async generateYearly() {
    return await this.reportsService.yearly();
  }

  @Get('fs')
  async generateFS() {
    return await this.reportsService.fs();
  }

  @Get('status/:scope')
  getStatus(@Param('scope') scope: string) {
    return {
      status: this.reportsService.state(scope),
      metrics: this.reportsService.getMetrics(scope),
    };
  }
}
