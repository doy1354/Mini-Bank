import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PoolClient } from 'pg';
import { DbService } from './db.service';

function envBool(v: string | undefined, defaultValue: boolean) {
  if (v === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

type Currency = 'USD' | 'EUR';

async function ensureUserWithAccounts(
  db: DbService,
  client: PoolClient,
  params: {
    email: string;
    name: string;
    password: string;
    initial: Record<Currency, bigint>;
  },
) {
  const { email, name, password, initial } = params;

  const existing = await db.queryWithClient<{ id: string }>(
    client,
    'SELECT id FROM users WHERE email = $1',
    [email],
  );
  let userId: string;
  if (existing.rows[0]) {
    userId = existing.rows[0].id;
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await db.queryWithClient<{ id: string }>(
      client,
      'INSERT INTO users(email, name, password_hash) VALUES($1,$2,$3) RETURNING id',
      [email, name, passwordHash],
    );
    userId = created.rows[0].id;
  }

  for (const currency of ['USD', 'EUR'] as const) {
    const balance = initial[currency];
    await db.queryWithClient(
      client,
      `
      INSERT INTO accounts(user_id, currency, balance_cents)
      VALUES($1, $2, $3)
      ON CONFLICT (user_id, currency) DO UPDATE
        SET balance_cents = EXCLUDED.balance_cents
      `,
      [userId, currency, balance.toString()],
    );
  }
}

export async function runSeedIfEnabled(config: ConfigService, db: DbService) {
  if (!envBool(config.get<string>('DB_AUTO_SEED'), false)) return;

  await db.withTransaction(async (client) => {
    await ensureUserWithAccounts(db, client, {
      email: 'system@bank.local',
      name: 'SYSTEM',
      password: 'disabled',
      initial: {
        USD: 1_000_000_000_000n,
        EUR: 1_000_000_000_000n,
      },
    });

    await ensureUserWithAccounts(db, client, {
      email: 'maria@test.com',
      name: 'Maria',
      password: 'Password123!',
      initial: { USD: 100_000n, EUR: 50_000n },
    });
    await ensureUserWithAccounts(db, client, {
      email: 'hassan@test.com',
      name: 'Hassan',
      password: 'Password123!',
      initial: { USD: 100_000n, EUR: 50_000n },
    });
    await ensureUserWithAccounts(db, client, {
      email: 'lina@test.com',
      name: 'Lina',
      password: 'Password123!',
      initial: { USD: 100_000n, EUR: 50_000n },
    });
  });
}


