import * as fs from 'node:fs';
import * as path from 'node:path';
import { Client } from 'pg';

type Migration = { name: string; sql: string };

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function loadMigrations(migrationsDir: string): Migration[] {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_.*\.sql$/i.test(f))
    .sort((a, b) => a.localeCompare(b));

  return files.map((name) => ({
    name,
    sql: fs.readFileSync(path.join(migrationsDir, name), 'utf8'),
  }));
}

async function main() {
  const databaseUrl = mustGetEnv('DATABASE_URL');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const migrationsDir = path.resolve(__dirname, '..', 'db', 'migrations');
  const migrations = loadMigrations(migrationsDir);

  await client.query('BEGIN');
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const appliedRes = await client.query<{ name: string }>(
      'SELECT name FROM schema_migrations',
    );
    const applied = new Set(appliedRes.rows.map((r) => r.name));

    for (const m of migrations) {
      if (applied.has(m.name)) continue;
      console.log(`[migrate] applying ${m.name}`);
      await client.query(m.sql);
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [
        m.name,
      ]);
    }

    await client.query('COMMIT');
    console.log('[migrate] done');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


