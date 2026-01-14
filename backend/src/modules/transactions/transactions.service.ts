import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient } from 'pg';
import { DbService } from '../../db/db.service';
import { Currency, parseMoneyToCents } from '../../utils/money';
import { computeFixedExchange } from '../../utils/exchange';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ExchangeDto } from './dto/exchange.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { TransferDto } from './dto/transfer.dto';
import { TransactionDetailDto } from './transaction-detail.dto';

type AccountLockRow = { id: string; balance_cents: string; currency: Currency; user_id: string };

@Injectable()
export class TransactionsService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private mapDbError(e: any): never {
    const msg = typeof e?.message === 'string' ? e.message : '';
    if (msg.includes('Insufficient funds')) {
      throw new BadRequestException('Insufficient funds');
    }
    if (msg.includes('Ledger is not balanced')) {
      throw new InternalServerErrorException('Ledger integrity failure');
    }
    throw e;
  }

  private async getUserIdByEmail(client: PoolClient, emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    const res = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );
    return res.rows[0]?.id || null;
  }

  private async getAccountIdForUserCurrency(
    client: PoolClient,
    userId: string,
    currency: Currency,
  ) {
    const res = await client.query<{ id: string }>(
      'SELECT id FROM accounts WHERE user_id = $1 AND currency = $2',
      [userId, currency],
    );
    return res.rows[0]?.id || null;
  }

  private async getSystemAccountId(client: PoolClient, currency: Currency) {
    const res = await client.query<{ id: string }>(
      `
      SELECT a.id
      FROM accounts a
      JOIN users u ON u.id = a.user_id
      WHERE u.email = 'system@bank.local' AND a.currency = $1
      `,
      [currency],
    );
    return res.rows[0]?.id || null;
  }

  private async lockAccounts(client: PoolClient, accountIds: string[]) {
    const res = await client.query<AccountLockRow>(
      `
      SELECT id, user_id, currency, balance_cents
      FROM accounts
      WHERE id = ANY($1::uuid[])
      ORDER BY id
      FOR UPDATE
      `,
      [accountIds],
    );
    if (res.rows.length !== accountIds.length) {
      throw new NotFoundException('Account not found');
    }
    return res.rows;
  }

  async transfer(userId: string, dto: TransferDto) {
    const amountCents = parseMoneyToCents(dto.amount);
    if (amountCents <= 0n) throw new BadRequestException('Amount must be > 0');

    const currency = dto.currency as Currency;
    const toEmail = dto.toEmail.trim().toLowerCase();

    return this.db.withTransaction(async (client) => {
      try {
        const toUserId = await this.getUserIdByEmail(client, toEmail);
        if (!toUserId) throw new NotFoundException('Recipient not found');
        if (toUserId === userId) throw new BadRequestException('Cannot transfer to self');

        const fromAccountId = await this.getAccountIdForUserCurrency(
          client,
          userId,
          currency,
        );
        const toAccountId = await this.getAccountIdForUserCurrency(
          client,
          toUserId,
          currency,
        );
        if (!fromAccountId || !toAccountId) {
          throw new NotFoundException('Account not found for currency');
        }

        const locked = await this.lockAccounts(client, [fromAccountId, toAccountId]);
        const from = locked.find((a) => a.id === fromAccountId)!;
        const fromBal = BigInt(from.balance_cents);
        if (fromBal < amountCents) throw new BadRequestException('Insufficient funds');

        const txRes = await client.query<{ id: string }>(
          `
          INSERT INTO transactions(
            type, from_user_id, to_user_id,
            currency, amount_cents, from_account_id, to_account_id
          )
          VALUES('transfer', $1, $2, $3, $4, $5, $6)
          RETURNING id
          `,
          [
            userId,
            toUserId,
            currency,
            amountCents.toString(),
            fromAccountId,
            toAccountId,
          ],
        );
        const transactionId = txRes.rows[0].id;

        await client.query(
          `
          INSERT INTO ledger_entries(transaction_id, account_id, currency, amount_cents)
          VALUES
            ($1, $2, $3, $4),
            ($1, $5, $3, $6)
          `,
          [
            transactionId,
            fromAccountId,
            currency,
            (-amountCents).toString(),
            toAccountId,
            amountCents.toString(),
          ],
        );

        await this.audit.writeWithClient(client, {
          userId,
          action: 'transaction.transfer',
          entityType: 'transaction',
          entityId: transactionId,
          metadata: { currency, amountCents: amountCents.toString(), toEmail },
        });

        this.realtime.notifyUser(userId, 'balances.updated', { reason: 'transfer', transactionId });
        this.realtime.notifyUser(toUserId, 'balances.updated', { reason: 'transfer', transactionId });
        return { id: transactionId };
      } catch (e) {
        this.mapDbError(e);
      }
    });
  }

  async exchange(userId: string, dto: ExchangeDto) {
    const srcAmount = parseMoneyToCents(dto.amount);
    if (srcAmount <= 0n) throw new BadRequestException('Amount must be > 0');

    const srcCurrency = dto.fromCurrency as Currency;
    const { toCurrency: dstCurrency, toAmountCents: dstAmount, rateNumer, rateDenom } =
      computeFixedExchange({ fromCurrency: srcCurrency, fromAmountCents: srcAmount });

    return this.db.withTransaction(async (client) => {
      try {
        const fromAccountId = await this.getAccountIdForUserCurrency(
          client,
          userId,
          srcCurrency,
        );
        const toAccountId = await this.getAccountIdForUserCurrency(
          client,
          userId,
          dstCurrency,
        );
        if (!fromAccountId || !toAccountId) {
          throw new NotFoundException('Account not found for currency');
        }

        const sysSrcAccountId = await this.getSystemAccountId(client, srcCurrency);
        const sysDstAccountId = await this.getSystemAccountId(client, dstCurrency);
        if (!sysSrcAccountId || !sysDstAccountId) {
          throw new InternalServerErrorException('System FX accounts not seeded');
        }

        const locked = await this.lockAccounts(client, [
          fromAccountId,
          toAccountId,
          sysSrcAccountId,
          sysDstAccountId,
        ]);
        const from = locked.find((a) => a.id === fromAccountId)!;
        const fromBal = BigInt(from.balance_cents);
        if (fromBal < srcAmount) throw new BadRequestException('Insufficient funds');

        const txRes = await client.query<{ id: string }>(
          `
          INSERT INTO transactions(
            type, from_user_id, to_user_id,
            from_account_id, to_account_id,
            src_currency, dst_currency,
            src_amount_cents, dst_amount_cents,
            rate_numerator, rate_denominator
          )
          VALUES('exchange', $1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
          `,
          [
            userId,
            fromAccountId,
            toAccountId,
            srcCurrency,
            dstCurrency,
            srcAmount.toString(),
            dstAmount.toString(),
            rateNumer.toString(),
            rateDenom.toString(),
          ],
        );
        const transactionId = txRes.rows[0].id;

        await client.query(
          `
          INSERT INTO ledger_entries(transaction_id, account_id, currency, amount_cents)
          VALUES
            ($1, $2, $3, $4),
            ($1, $5, $3, $6),
            ($1, $7, $8, $9),
            ($1, $10, $8, $11)
          `,
          [
            transactionId,
            fromAccountId,
            srcCurrency,
            (-srcAmount).toString(),
            sysSrcAccountId,
            srcAmount.toString(),
            sysDstAccountId,
            dstCurrency,
            (-dstAmount).toString(),
            toAccountId,
            dstAmount.toString(),
          ],
        );

        await this.audit.writeWithClient(client, {
          userId,
          action: 'transaction.exchange',
          entityType: 'transaction',
          entityId: transactionId,
          metadata: {
            srcCurrency,
            dstCurrency,
            srcAmountCents: srcAmount.toString(),
            dstAmountCents: dstAmount.toString(),
            rateNumerator: rateNumer.toString(),
            rateDenominator: rateDenom.toString(),
          },
        });

        this.realtime.notifyUser(userId, 'balances.updated', { reason: 'exchange', transactionId });
        return {
          id: transactionId,
          rate: `${srcCurrency}->${dstCurrency} ${rateNumer.toString()}/${rateDenom.toString()}`,
          dstAmountCents: dstAmount.toString(),
        };
      } catch (e) {
        this.mapDbError(e);
      }
    });
  }

  async list(userId: string, q: ListTransactionsDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const offset = (page - 1) * limit;

    const whereType = q.type ? 'AND t.type = $2' : '';
    const params: any[] = [userId];
    if (q.type) params.push(q.type);
    params.push(limit, offset);

    const res = await this.db.query<{
      id: string;
      type: 'transfer' | 'exchange';
      created_at: string;
      from_user_id: string;
      to_user_id: string;
      from_email: string;
      to_email: string;
      currency: Currency | null;
      amount_cents: string | null;
      src_currency: Currency | null;
      dst_currency: Currency | null;
      src_amount_cents: string | null;
      dst_amount_cents: string | null;
      rate_numerator: number | null;
      rate_denominator: number | null;
    }>(
      `
      SELECT
        t.*,
        fu.email as from_email,
        tu.email as to_email
      FROM transactions t
      JOIN users fu ON fu.id = t.from_user_id
      JOIN users tu ON tu.id = t.to_user_id
      WHERE (t.from_user_id = $1 OR t.to_user_id = $1)
      ${whereType}
      ORDER BY t.created_at DESC
      LIMIT $${q.type ? 3 : 2}
      OFFSET $${q.type ? 4 : 3}
      `,
      params,
    );

    const items = res.rows.map((r) => {
      if (r.type === 'transfer') {
        const direction = r.from_user_id === userId ? 'out' : 'in';
        const counterpartyEmail = direction === 'out' ? r.to_email : r.from_email;
        return {
          id: r.id,
          type: r.type,
          createdAt: r.created_at,
          direction,
          currency: r.currency,
          amountCents: r.amount_cents,
          counterpartyEmail,
        };
      }
      return {
        id: r.id,
        type: r.type,
        createdAt: r.created_at,
        srcCurrency: r.src_currency,
        dstCurrency: r.dst_currency,
        srcAmountCents: r.src_amount_cents,
        dstAmountCents: r.dst_amount_cents,
        rateNumerator: r.rate_numerator,
        rateDenominator: r.rate_denominator,
      };
    });

    return { page, limit, items };
  }

  async getDetail(userId: string, transactionId: string): Promise<TransactionDetailDto> {
    const txRes = await this.db.query<{
      id: string;
      type: 'transfer' | 'exchange';
      created_at: string;
      from_user_id: string;
      to_user_id: string;
      currency: Currency | null;
      amount_cents: string | null;
      src_currency: Currency | null;
      dst_currency: Currency | null;
      src_amount_cents: string | null;
      dst_amount_cents: string | null;
      rate_numerator: number | null;
      rate_denominator: number | null;
    }>(
      `
      SELECT
        id, type, created_at, from_user_id, to_user_id,
        currency, amount_cents,
        src_currency, dst_currency, src_amount_cents, dst_amount_cents,
        rate_numerator, rate_denominator
      FROM transactions
      WHERE id = $1
      `,
      [transactionId],
    );

    const tx = txRes.rows[0];
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.from_user_id !== userId && tx.to_user_id !== userId) {
      throw new NotFoundException('Transaction not found');
    }

    const leRes = await this.db.query<{
      id: string;
      account_id: string;
      currency: string;
      amount_cents: string;
      created_at: string;
    }>(
      `
      SELECT id, account_id, currency, amount_cents, created_at
      FROM ledger_entries
      WHERE transaction_id = $1
      ORDER BY created_at ASC
      `,
      [transactionId],
    );

    return {
      id: tx.id,
      type: tx.type,
      createdAt: tx.created_at,
      fromUserId: tx.from_user_id,
      toUserId: tx.to_user_id,
      currency: tx.currency,
      amountCents: tx.amount_cents,
      srcCurrency: tx.src_currency,
      dstCurrency: tx.dst_currency,
      srcAmountCents: tx.src_amount_cents,
      dstAmountCents: tx.dst_amount_cents,
      rateNumerator: tx.rate_numerator,
      rateDenominator: tx.rate_denominator,
      ledgerEntries: leRes.rows.map((r) => ({
        id: r.id,
        accountId: r.account_id,
        currency: r.currency,
        amountCents: r.amount_cents,
        createdAt: r.created_at,
      })),
    };
  }
}


