import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payrollRuns, payrollRecords } from '@/drizzle/schema';
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
    const runId = parseInt(id, 10);
    if (isNaN(runId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const run = await db.query.payrollRuns.findFirst({
      where: eq(payrollRuns.id, runId),
    });

    if (!run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    const records = await db
      .select()
      .from(payrollRecords)
      .where(eq(payrollRecords.runId, runId))
      .orderBy(payrollRecords.employeeNo);

    return NextResponse.json({ run, records });
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
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const runId = parseInt(id, 10);
    if (isNaN(runId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const result = await db
      .update(payrollRuns)
      .set({ isFinal: false })
      .where(eq(payrollRuns.id, runId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    await logAudit({
      userId: session.userId,
      action: 'unfinalise',
      entity: 'payroll_run',
      entityId: runId,
      details: `Un-finalised payroll run ${runId}`,
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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const runId = parseInt(id, 10);
    if (isNaN(runId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Delete records first (cascade), then the run
    await db.delete(payrollRecords).where(eq(payrollRecords.runId, runId));
    const result = await db.delete(payrollRuns).where(eq(payrollRuns.id, runId)).returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    await logAudit({
      userId: session.userId,
      action: 'delete',
      entity: 'payroll_run',
      entityId: runId,
      details: `Deleted payroll run ${runId}`,
      orgId: session.orgId || undefined,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
