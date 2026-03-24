import { db } from './db';
import { auditTrail } from '@/drizzle/schema';

export async function logAudit(params: {
  userId: number;
  action: string;
  entity: string;
  entityId?: number;
  details?: string;
  orgId?: number;
}) {
  await db.insert(auditTrail).values({
    userId: params.userId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId || null,
    details: params.details || null,
    orgId: params.orgId || null,
    createdAt: new Date().toISOString(),
  });
}
