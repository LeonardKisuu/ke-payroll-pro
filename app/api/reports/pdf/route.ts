import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payrollRuns, payrollRecords, employees, organisations } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { renderToBuffer } from '@react-pdf/renderer';
import { ReportDocument } from '@/lib/pdf-generator';
import type { ReportData } from '@/lib/pdf-generator';
import React from 'react';

const VALID_TYPES = ['summary', 'kra', 'nssf', 'shif', 'ahl'] as const;
type ReportType = (typeof VALID_TYPES)[number];

const FILE_NAMES: Record<ReportType, string> = {
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
    const type = searchParams.get('type') as ReportType;
    const month = parseInt(searchParams.get('month') || '', 10);
    const year = parseInt(searchParams.get('year') || '', 10);
    const orgId = parseInt(searchParams.get('orgId') || '', 10);

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
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
      return NextResponse.json({ error: 'No payroll run found for this period' }, { status: 404 });
    }

    // Fetch payroll records
    const records = await db
      .select()
      .from(payrollRecords)
      .where(eq(payrollRecords.runId, run.id));

    // Fetch employees for additional data (KRA PIN, NSSF No, NHIF No, ID Number)
    const employeeRows = await db
      .select()
      .from(employees)
      .where(eq(employees.orgId, orgId));

    const empMap = new Map(employeeRows.map((e) => [e.id, e]));

    // Enrich records with employee data
    const enrichedRecords = records.map((r) => {
      const emp = empMap.get(r.employeeId);
      return {
        employeeNo: r.employeeNo,
        employeeName: r.employeeName,
        basicSalary: r.basicSalary,
        houseAllowance: r.houseAllowance,
        transportAllowance: r.transportAllowance,
        otherAllowances: r.otherAllowances,
        grossPay: r.grossPay,
        fringeBenefits: r.fringeBenefits,
        grossForPaye: r.grossForPaye,
        nssfEmployee: r.nssfEmployee,
        nssfEmployer: r.nssfEmployer,
        shif: r.shif,
        ahlEmployee: r.ahlEmployee,
        ahlEmployer: r.ahlEmployer,
        taxableIncome: r.taxableIncome,
        payeGrossTax: r.payeGrossTax,
        personalRelief: r.personalRelief,
        paye: r.paye,
        totalDeductions: r.totalDeductions,
        netPay: r.netPay,
        nita: r.nita,
        kraPin: emp?.kraPin ?? '',
        nssfNo: emp?.nssfNo ?? '',
        nhifNo: emp?.nhifNo ?? '',
        idNumber: emp?.idNumber ?? '',
      };
    });

    // Get org info
    const org = await db.query.organisations.findFirst({
      where: eq(organisations.id, orgId),
    });

    const reportData: ReportData = {
      orgName: org?.name || 'Organisation',
      primaryColor: org?.primaryColor || '#1B3A6B',
      secondaryColor: org?.secondaryColor || '#C9A046',
      month,
      year,
      type,
      records: enrichedRecords,
    };

    const buffer = await renderToBuffer(
      React.createElement(ReportDocument, { data: reportData }) as any
    );

    const fileName = `${FILE_NAMES[type]}_${year}_${String(month).padStart(2, '0')}.pdf`;

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error('Report PDF generation error:', err);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
