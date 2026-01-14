import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { DbService } from './db/db.service';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { AuditModule } from './modules/audit/audit.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { runMigrationsIfEnabled } from './db/migration-runner';
import { runSeedIfEnabled } from './db/seed-runner';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuditModule,
    RealtimeModule,
    AuthModule,
    AccountsModule,
    TransactionsModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly config: ConfigService,
    private readonly db: DbService,
  ) {}

  async onModuleInit() {
    await runMigrationsIfEnabled(this.config, this.db);
    await runSeedIfEnabled(this.config, this.db);
  }
}


