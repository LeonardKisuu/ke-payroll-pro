import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payrollRuns } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'accountant')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId } = await request.json();
    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 });
    }

    const run = await db.query.payrollRuns.findFirst({
      where: eq(payrollRuns.id, runId),
    });

    if (!run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    if (run.isFinal) {
      return NextResponse.json({ error: 'Payroll is already finalised' }, { status: 400 });
    }

    const result = await db
      .update(payrollRuns)
      .set({ isFinal: true })
      .where(eq(payrollRuns.id, runId))
      .returning();

    await logAudit({
      userId: session.userId,
      action: 'finalise',
      entity: 'payroll_run',
      entityId: runId,
      details: `Finalised payroll run ${runId}`,
      orgId: session.orgId || undefined,
    });

    return NextResponse.json(result[0]);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
