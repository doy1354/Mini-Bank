import { Client } from "pg";
import * as bcrypt from "bcrypt";

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

type Currency = "USD" | "EUR";

async function ensureUserWithAccounts(
  client: Client,
  params: {
    email: string;
    name: string;
    password: string;
    initial: Record<Currency, bigint>;
  }
) {
  const { email, name, password, initial } = params;
  const existing = await client.query<{ id: string }>(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );
  let userId: string;
  if (existing.rows[0]) {
    userId = existing.rows[0].id;
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await client.query<{ id: string }>(
      "INSERT INTO users(email, name, password_hash) VALUES($1,$2,$3) RETURNING id",
      [email, name, passwordHash]
    );
    userId = created.rows[0].id;
  }

  for (const currency of ["USD", "EUR"] as const) {
    const balance = initial[currency];
    await client.query(
      `
      INSERT INTO accounts(user_id, currency, balance_cents)
      VALUES($1, $2, $3)
      ON CONFLICT (user_id, currency) DO UPDATE
        SET balance_cents = EXCLUDED.balance_cents
      `,
      [userId, currency, balance.toString()]
    );
  }

  return userId;
}

async function main() {
  const databaseUrl = mustGetEnv("DATABASE_URL");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  await client.query("BEGIN");
  try {
    await ensureUserWithAccounts(client, {
      email: "system@bank.local",
      name: "SYSTEM",
      password: "disabled",
      initial: {
        USD: 1_000_000_000_000n,
        EUR: 1_000_000_000_000n,
      },
    });

    await ensureUserWithAccounts(client, {
      email: "maria@test.com",
      name: "Maria",
      password: "Password123!",
      initial: {
        USD: 100_000n,
        EUR: 50_000n,
      },
    });
    await ensureUserWithAccounts(client, {
      email: "hassan@test.com",
      name: "Hassan",
      password: "Password123!",
      initial: {
        USD: 100_000n,
        EUR: 50_000n,
      },
    });
    await ensureUserWithAccounts(client, {
      email: "lina@test.com",
      name: "Lina",
      password: "Password123!",
      initial: {
        USD: 100_000n,
        EUR: 50_000n,
      },
    });

    await client.query("COMMIT");
    console.log("[seed] done");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
