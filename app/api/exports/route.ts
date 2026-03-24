import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payrollRuns, payrollRecords, employees, organisations } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import {
  generateBankSchedule,
  generatePayrollSummary,
  generateKRASchedule,
  generateNSSFSchedule,
  generateSHIFSchedule,
  generateAHLSchedule,
} from '@/lib/excel-export';

const VALID_TYPES = ['bank', 'summary', 'kra', 'nssf', 'shif', 'ahl'] as const;
type ExportType = (typeof VALID_TYPES)[number];

const FILE_NAMES: Record<ExportType, string> = {
  bank: 'Bank_Payment_Schedule',
  summary: 'Payroll_Summary',
  kra: 'KRA_P10_Schedule',
  nssf: 'NSSF_Schedule',
  shif: 'SHIF_Schedule',
  ahl: 'AHL_Schedule',
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'accountant')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') as ExportType;
    const month = parseInt(searchParams.get('month') || '', 10);
    const year = parseInt(searchParams.get('year') || '', 10);
    const orgId = parseInt(searchParams.get('orgId') || '', 10);

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }
    if (!month || month < 1 || month > 12 || !year || !orgId) {
      return NextResponse.json({ error: 'month, year, and orgId are required' }, { status: 400 });
    }

    // Find the payroll run for this period
    const run = await db.query.payrollRuns.findFirst({
      where: and(
        eq(payrollRuns.month, month),
        eq(payrollRuns.year, year),
        eq(payrollRuns.orgId, orgId)
      ),
    });

    if (!run) {
      return NextResponse.json(
        { error: 'No payroll run found for this period' },
        { status: 404 }
      );
    }

    // Fetch payroll records
    const records = await db
      .select()
      .from(payrollRecords)
      .where(eq(payrollRecords.runId, run.id));

    // For bank/kra/nssf/shif/ahl schedules, join employee data
    const employeeRows = await db
      .select()
      .from(employees)
      .where(eq(employees.orgId, orgId));

    const empMap = new Map(employeeRows.map((e) => [e.id, e]));

    // Merge employee fields into payroll records
    const enrichedRecords = records.map((r) => {
      const emp = empMap.get(r.employeeId);
      return {
        ...r,
        kraPin: emp?.kraPin ?? null,
        nssfNo: emp?.nssfNo ?? null,
        nhifNo: emp?.nhifNo ?? null,
        idNumber: emp?.idNumber ?? null,
        bankName: emp?.bankName ?? null,
        bankBranch: emp?.bankBranch ?? null,
        bankAccountNo: emp?.bankAccountNo ?? null,
        bankCode: emp?.bankCode ?? null,
      };
    });

    // Get org name for report headers
    const org = await db.query.organisations.findFirst({
      where: eq(organisations.id, orgId),
    });
    const orgName = org?.name || 'Organisation';

    // Generate the appropriate Excel file
    let buffer: Buffer;
    switch (type) {
      case 'bank':
        buffer = generateBankSchedule(enrichedRecords, orgName, month, year);
        break;
      case 'summary':
        buffer = generatePayrollSummary(enrichedRecords, orgName, month, year);
        break;
      case 'kra':
        buffer = generateKRASchedule(enrichedRecords, orgName, month, year);
        break;
      case 'nssf':
        buffer = generateNSSFSchedule(enrichedRecords, orgName, month, year);
        break;
      case 'shif':
        buffer = generateSHIFSchedule(enrichedRecords, orgName, month, year);
        break;
      case 'ahl':
        buffer = generateAHLSchedule(enrichedRecords, orgName, month, year);
        break;
    }

    const fileName = `${FILE_NAMES[type]}_${year}_${String(month).padStart(2, '0')}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
