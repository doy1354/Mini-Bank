import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { AccountsReconcileService } from './accounts.reconcile.service';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsReconcileController {
  constructor(private readonly svc: AccountsReconcileService) {}

  @Get('reconcile')
  async reconcile(@CurrentUser() user: RequestUser) {
    return this.svc.reconcileForUser(user.userId);
  }
}


