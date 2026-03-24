import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customDeductions } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const dedId = parseInt(id, 10);
    if (isNaN(dedId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const deduction = await db.query.customDeductions.findFirst({
      where: eq(customDeductions.id, dedId),
    });

    if (!deduction) {
      return NextResponse.json({ error: 'Deduction not found' }, { status: 404 });
    }

    return NextResponse.json(deduction);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'accountant')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const dedId = parseInt(id, 10);
    if (isNaN(dedId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();

    const result = await db
      .update(customDeductions)
      .set({
        name: body.name,
        description: body.description || null,
        deductionType: body.deductionType || 'fixed',
        isPensionContribution: body.isPensionContribution || false,
        isEmployerCost: body.isEmployerCost || false,
        isActive: body.isActive ?? true,
      })
      .where(eq(customDeductions.id, dedId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Deduction not found' }, { status: 404 });
    }

    await logAudit({
      userId: session.userId,
      action: 'update',
      entity: 'custom_deduction',
      entityId: dedId,
      details: `Updated custom deduction: ${result[0].name}`,
      orgId: session.orgId || undefined,
    });

    return NextResponse.json(result[0]);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const dedId = parseInt(id, 10);
    if (isNaN(dedId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const result = await db
      .update(customDeductions)
      .set({ isActive: false })
      .where(eq(customDeductions.id, dedId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Deduction not found' }, { status: 404 });
    }

    await logAudit({
      userId: session.userId,
      action: 'deactivate',
      entity: 'custom_deduction',
      entityId: dedId,
      details: `Deactivated custom deduction: ${result[0].name}`,
      orgId: session.orgId || undefined,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
