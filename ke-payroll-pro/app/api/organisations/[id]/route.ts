import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organisations } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const org = await db.query.organisations.findFirst({
      where: eq(organisations.id, parseInt(id, 10)),
    });

    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(org);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const orgId = parseInt(id, 10);
    const body = await request.json();

    const updateData: Record<string, string | boolean | null> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.kraPin !== undefined) updateData.kraPin = body.kraPin || null;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl || null;
    if (body.primaryColor !== undefined) updateData.primaryColor = body.primaryColor;
    if (body.secondaryColor !== undefined) updateData.secondaryColor = body.secondaryColor;
    if (body.address !== undefined) updateData.address = body.address || null;
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail || null;
    if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    await db.update(organisations).set(updateData).where(eq(organisations.id, orgId));

    const updated = await db.query.organisations.findFirst({
      where: eq(organisations.id, orgId),
    });

    await logAudit({
      userId: session.userId,
      action: 'update',
      entity: 'organisation',
      entityId: orgId,
      details: `Updated organisation fields: ${Object.keys(updateData).join(', ')}`,
      orgId,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
