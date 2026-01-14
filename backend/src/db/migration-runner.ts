import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { DbService } from './db.service';

function envBool(v: string | undefined, defaultValue: boolean) {
  if (v === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

export async function runMigrationsIfEnabled(
  config: ConfigService,
  db: DbService,
) {
  if (!envBool(config.get<string>('DB_AUTO_MIGRATE'), false)) return;

  const migrationsDir = path.resolve(process.cwd(), 'db', 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_.*\.sql$/i.test(f))
    .sort((a, b) => a.localeCompare(b));

  await db.withTransaction(async (client) => {
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

    for (const name of files) {
      if (applied.has(name)) continue;
      console.log(`[migrate] applying ${name}`);
      const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [
        name,
      ]);
    }
  });
}


