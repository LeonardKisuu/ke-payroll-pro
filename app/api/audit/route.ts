import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditTrail, users } from '@/drizzle/schema';
import { eq, and, gte, lte, like, desc, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const orgId = searchParams.get('orgId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const action = searchParams.get('action');
    const entity = searchParams.get('entity');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];

    if (orgId && orgId !== '__all') {
      conditions.push(eq(auditTrail.orgId, parseInt(orgId, 10)));
    }
    if (dateFrom) {
      conditions.push(gte(auditTrail.createdAt, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(auditTrail.createdAt, dateTo + 'T23:59:59'));
    }
    if (action && action !== '__all') {
      conditions.push(eq(auditTrail.action, action));
    }
    if (entity && entity !== '__all') {
      conditions.push(eq(auditTrail.entity, entity));
    }
    if (search) {
      conditions.push(like(auditTrail.details, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditTrail)
      .where(whereClause);
    const total = countResult[0]?.count || 0;

    // Get paginated entries with user name join
    const entries = await db
      .select({
        id: auditTrail.id,
        userId: auditTrail.userId,
        action: auditTrail.action,
        entity: auditTrail.entity,
        entityId: auditTrail.entityId,
        details: auditTrail.details,
        orgId: auditTrail.orgId,
        createdAt: auditTrail.createdAt,
        userName: users.fullName,
      })
      .from(auditTrail)
      .leftJoin(users, eq(auditTrail.userId, users.id))
      .where(whereClause)
      .orderBy(desc(auditTrail.id))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ entries, total, page, limit });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
