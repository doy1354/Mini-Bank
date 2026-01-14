import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';

type Row = {
  account_id: string;
  currency: string;
  balance_cents: string;
  ledger_sum_cents: string;
  diff_cents: string;
};

@Injectable()
export class AccountsReconcileService {
  constructor(private readonly db: DbService) {}

  async reconcileForUser(userId: string) {
    const res = await this.db.query<Row>(
      `
      SELECT
        a.id AS account_id,
        a.currency,
        a.balance_cents::bigint AS balance_cents,
        COALESCE(SUM(le.amount_cents), 0)::bigint AS ledger_sum_cents,
        (a.balance_cents::bigint - COALESCE(SUM(le.amount_cents), 0)::bigint)::bigint AS diff_cents
      FROM accounts a
      LEFT JOIN ledger_entries le ON le.account_id = a.id
      WHERE a.user_id = $1
      GROUP BY a.id, a.currency, a.balance_cents
      ORDER BY a.currency
      `,
      [userId],
    );

    const items = res.rows.map((r) => ({
      accountId: r.account_id,
      currency: r.currency,
      balanceCents: r.balance_cents,
      ledgerSumCents: r.ledger_sum_cents,
      diffCents: r.diff_cents,
      ok: r.diff_cents === '0',
    }));

    return {
      ok: items.every((x) => x.ok),
      items,
    };
  }
}


