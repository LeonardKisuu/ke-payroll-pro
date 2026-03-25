import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  employees,
  payrollRuns,
  payrollRecords,
  customDeductions,
  employeeCustomDeductions,
  organisations,
} from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { computePayroll } from '@/lib/payroll-calculator';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const conditions = [eq(payrollRuns.orgId, session.orgId)];
    if (month) conditions.push(eq(payrollRuns.month, parseInt(month, 10)));
    if (year) conditions.push(eq(payrollRuns.year, parseInt(year, 10)));

    const runs = await db
      .select()
      .from(payrollRuns)
      .where(and(...conditions))
      .orderBy(desc(payrollRuns.year), desc(payrollRuns.month));

    return NextResponse.json(runs);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'accountant')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.orgId) {
      return NextResponse.json({ error: 'No organisation selected' }, { status: 400 });
    }

    const body = await request.json();
    const { month, year, overrides } = body;

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    // Check for existing finalized run
    const existingRun = await db.query.payrollRuns.findFirst({
      where: and(
        eq(payrollRuns.month, month),
        eq(payrollRuns.year, year),
        eq(payrollRuns.orgId, session.orgId)
      ),
    });

    if (existingRun?.isFinal) {
      return NextResponse.json(
        { error: `Payroll for ${MONTH_NAMES[month]} ${year} is already finalised. Un-finalise it first.` },
        { status: 409 }
      );
    }

    // Fetch active employees
    const activeEmployees = await db
      .select()
      .from(employees)
      .where(and(eq(employees.orgId, session.orgId), eq(employees.isActive, true)))
      .orderBy(employees.employeeNo);

    if (activeEmployees.length === 0) {
      return NextResponse.json({ error: 'No active employees found' }, { status: 400 });
    }

    // Fetch all active custom deductions for the org
    const orgDeductions = await db
      .select()
      .from(customDeductions)
      .where(and(eq(customDeductions.orgId, session.orgId), eq(customDeductions.isActive, true)));

    // Fetch all employee custom deduction assignments
    const allAssignments = await db
      .select()
      .from(employeeCustomDeductions)
      .where(eq(employeeCustomDeductions.isActive, true));

    // Build override map (keyed by employee_no)
    const overrideMap: Record<string, Record<string, number>> = {};
    if (overrides && Array.isArray(overrides)) {
      for (const ov of overrides) {
        if (ov.employee_no) {
          overrideMap[ov.employee_no] = ov;
        }
      }
    }

    const now = new Date().toISOString();

    // If there's an existing non-final run, delete its records and the run itself
    if (existingRun) {
      await db.delete(payrollRecords).where(eq(payrollRecords.runId, existingRun.id));
      await db.delete(payrollRuns).where(eq(payrollRuns.id, existingRun.id));
    }

    // Create payroll run
    const runResult = await db.insert(payrollRuns).values({
      month,
      year,
      orgId: session.orgId,
      isFinal: false,
      runBy: session.userId,
      runAt: now,
      createdAt: now,
    }).returning();

    const run = runResult[0];

    // Process each employee
    const recordsToInsert = [];

    for (const emp of activeEmployees) {
      const ov = overrideMap[emp.employeeNo] || {};

      // Get employee's custom deduction assignments
      const empAssignments = allAssignments.filter((a) => a.employeeId === emp.id);
      const empDeductions = empAssignments.map((a) => {
        const dedDef = orgDeductions.find((d) => d.id === a.deductionId);
        return {
          name: dedDef?.name || 'Unknown',
          amount: a.amount,
          deductionType: (dedDef?.deductionType || 'fixed') as 'fixed' | 'percent',
          isPensionContribution: dedDef?.isPensionContribution || false,
          isEmployerCost: dedDef?.isEmployerCost || false,
        };
      });

      const result = computePayroll(
        {
          basicSalary: ov.basic_salary ?? emp.basicSalary,
          houseAllowance: ov.house_allowance ?? emp.houseAllowance ?? 0,
          commuterAllowance: ov.commuter_allowance ?? emp.commuterAllowance ?? 0,
          carAllowance: ov.car_allowance ?? emp.carAllowance ?? 0,
          otherAllowances: ov.other_allowances ?? emp.otherAllowances ?? 0,
          bonusPay: ov.bonus_pay ?? emp.bonusPay ?? 0,
          leavePay: ov.leave_pay ?? emp.leavePay ?? 0,
          leaveDeduction: ov.leave_deduction ?? emp.leaveDeduction ?? 0,
          arrears: ov.arrears ?? emp.arrears ?? 0,
          airtimeBenefit: ov.airtime_benefit ?? emp.airtimeBenefit ?? 0,
          internetBenefit: ov.internet_benefit ?? emp.internetBenefit ?? 0,
          otherFringeBenefits: ov.other_fringe_benefits ?? emp.otherFringeBenefits ?? 0,
        },
        empDeductions
      );

      recordsToInsert.push({
        runId: run.id,
        employeeId: emp.id,
        orgId: session.orgId,
        employeeNo: emp.employeeNo,
        employeeName: emp.fullName,
        basicSalary: result.basicSalary,
        houseAllowance: result.houseAllowance,
        commuterAllowance: result.commuterAllowance,
        carAllowance: result.carAllowance,
        otherAllowances: result.otherAllowances,
        bonusPay: result.bonusPay,
        leavePay: result.leavePay,
        leaveDeduction: result.leaveDeduction,
        arrears: result.arrears,
        grossPay: result.grossPay,
        airtimeBenefit: result.airtimeBenefit,
        internetBenefit: result.internetBenefit,
        otherFringeBenefits: result.otherFringeBenefits,
        fringeBenefits: result.fringeBenefits,
        grossForPaye: result.grossForPaye,
        nssfEmployee: result.nssfEmployee,
        nssfEmployer: result.nssfEmployer,
        shif: result.shif,
        ahlEmployee: result.ahlEmployee,
        ahlEmployer: result.ahlEmployer,
        pensionContributions: result.pensionContributions,
        pensionRelief: result.pensionRelief,
        taxableIncome: result.taxableIncome,
        payeGrossTax: result.payeGrossTax,
        personalRelief: result.personalRelief,
        paye: result.paye,
        customDeductionsJson: JSON.stringify(result.customDeductions),
        customDeductionsTotal: result.customDeductionsTotal,
        employerCustomDeductionsTotal: result.employerCustomDeductionsTotal,
        totalDeductions: result.totalDeductions,
        netPay: result.netPay,
        nita: result.nita,
        createdAt: now,
      });
    }

    // Batch insert records
    for (const rec of recordsToInsert) {
      await db.insert(payrollRecords).values(rec);
    }

    await logAudit({
      userId: session.userId,
      action: 'run_payroll',
      entity: 'payroll_run',
      entityId: run.id,
      details: `Processed payroll for ${MONTH_NAMES[month]} ${year} — ${activeEmployees.length} employees`,
      orgId: session.orgId,
    });

    // Fetch inserted records to return
    const insertedRecords = await db
      .select()
      .from(payrollRecords)
      .where(eq(payrollRecords.runId, run.id))
      .orderBy(payrollRecords.employeeNo);

    return NextResponse.json({ run, records: insertedRecords }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'A payroll run already exists for this period' },
        { status: 409 }
      );
    }
    console.error('Payroll processing error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
