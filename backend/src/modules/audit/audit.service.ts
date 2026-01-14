import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DbService } from '../../db/db.service';

@Injectable()
export class AuditService {
  constructor(private readonly db: DbService) {}

  async write(params: {
    userId: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: any;
  }) {
    const {
      userId,
      action,
      entityType = null,
      entityId = null,
      ip = null,
      userAgent = null,
      metadata = {},
    } = params;

    await this.db.query(
      `
      INSERT INTO audit_logs(user_id, action, entity_type, entity_id, ip, user_agent, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      `,
      [userId, action, entityType, entityId, ip, userAgent, JSON.stringify(metadata)],
    );
  }

  async writeWithClient(
    client: PoolClient,
    params: {
      userId: string | null;
      action: string;
      entityType?: string | null;
      entityId?: string | null;
      ip?: string | null;
      userAgent?: string | null;
      metadata?: any;
    },
  ) {
    const {
      userId,
      action,
      entityType = null,
      entityId = null,
      ip = null,
      userAgent = null,
      metadata = {},
    } = params;

    await client.query(
      `
      INSERT INTO audit_logs(user_id, action, entity_type, entity_id, ip, user_agent, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      `,
      [userId, action, entityType, entityId, ip, userAgent, JSON.stringify(metadata)],
    );
  }
}



