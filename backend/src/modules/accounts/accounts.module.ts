import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountsReconcileController } from './accounts.reconcile.controller';
import { AccountsReconcileService } from './accounts.reconcile.service';

@Module({
  controllers: [AccountsController, AccountsReconcileController],
  providers: [AccountsService, AccountsReconcileService],
})
export class AccountsModule {}


