import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { FinanceService } from './finance.service';

@Controller('admin/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Roles('ADMIN')
  @Get('overview')
  getOverview() {
    return this.financeService.getOverview();
  }
}
