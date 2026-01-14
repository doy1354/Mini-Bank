import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { Currency } from '../../utils/money';

type AccountRow = {
  id: string;
  user_id: string;
  currency: Currency;
  balance_cents: string;
};

@Injectable()
export class AccountsService {
  constructor(private readonly db: DbService) {}

  async listForUser(userId: string) {
    const res = await this.db.query<AccountRow>(
      'SELECT id, user_id, currency, balance_cents FROM accounts WHERE user_id = $1 ORDER BY currency',
      [userId],
    );
    return res.rows.map((r) => ({
      id: r.id,
      currency: r.currency,
      balanceCents: r.balance_cents,
    }));
  }

  async getBalance(userId: string, accountId: string) {
    const res = await this.db.query<AccountRow>(
      'SELECT id, user_id, currency, balance_cents FROM accounts WHERE id = $1',
      [accountId],
    );
    const row = res.rows[0];
    if (!row) throw new NotFoundException('Account not found');
    if (row.user_id !== userId) throw new ForbiddenException();

    return {
      accountId: row.id,
      currency: row.currency,
      balanceCents: row.balance_cents,
    };
  }
}


