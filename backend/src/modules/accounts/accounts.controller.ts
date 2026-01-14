import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { AccountsService } from './accounts.service';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return this.accounts.listForUser(user.userId);
  }

  @Get(':id/balance')
  async balance(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.accounts.getBalance(user.userId, id);
  }
}


