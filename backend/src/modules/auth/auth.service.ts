import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DbService } from '../../db/db.service';
import { AuditService } from '../audit/audit.service';

type UserRow = { id: string; email: string; name: string; password_hash: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async register(params: {
    email: string;
    name: string;
    password: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const email = params.email.trim().toLowerCase();
    const name = params.name.trim();
    const passwordHash = await bcrypt.hash(params.password, 10);

    return this.db.withTransaction(async (client) => {
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM users WHERE email = $1',
        [email],
      );
      if (existing.rows[0]) {
        throw new BadRequestException('Email already registered');
      }

      const created = await client.query<{ id: string; email: string; name: string }>(
        'INSERT INTO users(email, name, password_hash) VALUES($1,$2,$3) RETURNING id, email, name',
        [email, name, passwordHash],
      );
      const user = created.rows[0];

      await client.query(
        'INSERT INTO accounts(user_id, currency, balance_cents) VALUES ($1,$2,$3)',
        [user.id, 'USD', '100000'],
      );
      await client.query(
        'INSERT INTO accounts(user_id, currency, balance_cents) VALUES ($1,$2,$3)',
        [user.id, 'EUR', '50000'],
      );

      await this.audit.writeWithClient(client, {
        userId: user.id,
        action: 'auth.register',
        entityType: 'user',
        entityId: user.id,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
        metadata: { email },
      });

      const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
      return { user, token };
    });
  }

  async login(params: {
    email: string;
    password: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const email = params.email.trim().toLowerCase();
    const res = await this.db.query<UserRow>(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email],
    );
    const user = res.rows[0];
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(params.password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.audit.write({
      userId: user.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
      metadata: { email },
    });

    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { user: { id: user.id, email: user.email, name: user.name }, token };
  }

  async me(userId: string) {
    const res = await this.db.query<{ id: string; email: string; name: string }>(
      'SELECT id, email, name FROM users WHERE id = $1',
      [userId],
    );
    return res.rows[0] || null;
  }
}


