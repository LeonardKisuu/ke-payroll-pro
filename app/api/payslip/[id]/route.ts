import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payrollRecords, payrollRuns, employees, organisations, users } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { renderToBuffer } from '@react-pdf/renderer';
import { PayslipDocument } from '@/lib/pdf-generator';
import type { PayslipData } from '@/lib/pdf-generator';
import React from 'react';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const recordId = parseInt(id, 10);
    if (isNaN(recordId)) {
      return NextResponse.json({ error: 'Invalid record ID' }, { status: 400 });
    }

    // Fetch the payroll record
    const record = await db.query.payrollRecords.findFirst({
      where: eq(payrollRecords.id, recordId),
    });

    if (!record) {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
    }

    // Auth check: HR users can only view their own payslips
    if (session.role === 'hr') {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
      });
      if (!user?.employeeId || user.employeeId !== record.employeeId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Fetch the payroll run for month/year
    const run = await db.query.payrollRuns.findFirst({
      where: eq(payrollRuns.id, record.runId),
    });

    // Fetch employee details
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, record.employeeId),
    });

    // Fetch organisation
    const org = await db.query.organisations.findFirst({
      where: eq(organisations.id, record.orgId),
    });

    // Parse custom deductions from JSON
    let customDeductions: Array<{ name: string; amount: number }> = [];
    if (record.customDeductionsJson) {
      try {
        const parsed = JSON.parse(record.customDeductionsJson);
        customDeductions = Array.isArray(parsed)
          ? parsed.filter((d: { isEmployerCost?: boolean }) => !d.isEmployerCost).map((d: { name: string; amount: number }) => ({
              name: d.name,
              amount: d.amount,
            }))
          : [];
      } catch {
        // Invalid JSON, ignore
      }
    }

    const payslipData: PayslipData = {
      orgName: org?.name || 'Organisation',
      orgLogo: org?.logoUrl || undefined,
      orgAddress: org?.address || undefined,
      orgContact: org?.contactEmail || org?.contactPhone || undefined,
      primaryColor: org?.primaryColor || '#1B3A6B',
      secondaryColor: org?.secondaryColor || '#C9A046',
      employeeName: record.employeeName || employee?.fullName || '',
      employeeNo: record.employeeNo || employee?.employeeNo || '',
      idNumber: employee?.idNumber || '',
      kraPin: employee?.kraPin || '',
      nssfNo: employee?.nssfNo || '',
      nhifNo: employee?.nhifNo || '',
      department: employee?.department || '',
      designation: employee?.designation || '',
      bankName: employee?.bankName || '',
      bankBranch: employee?.bankBranch || '',
      bankAccountNo: employee?.bankAccountNo || '',
      month: run?.month || 1,
      year: run?.year || new Date().getFullYear(),
      basicSalary: record.basicSalary || 0,
      houseAllowance: record.houseAllowance || 0,
      commuterAllowance: record.commuterAllowance || 0,
      carAllowance: record.carAllowance || 0,
      otherAllowances: record.otherAllowances || 0,
      bonusPay: record.bonusPay || 0,
      leavePay: record.leavePay || 0,
      leaveDeduction: record.leaveDeduction || 0,
      arrears: record.arrears || 0,
      grossPay: record.grossPay || 0,
      fringeBenefits: record.fringeBenefits || 0,
      nssfEmployee: record.nssfEmployee || 0,
      nssfEmployer: record.nssfEmployer || 0,
      shif: record.shif || 0,
      ahlEmployee: record.ahlEmployee || 0,
      ahlEmployer: record.ahlEmployer || 0,
      pensionRelief: record.pensionRelief || 0,
      taxableIncome: record.taxableIncome || 0,
      payeGrossTax: record.payeGrossTax || 0,
      personalRelief: record.personalRelief || 0,
      paye: record.paye || 0,
      customDeductions,
      totalDeductions: record.totalDeductions || 0,
      netPay: record.netPay || 0,
      nita: record.nita || 50,
    };

    const buffer = await renderToBuffer(
      React.createElement(PayslipDocument, { data: payslipData }) as any
    );

    const monthStr = String(run?.month || 1).padStart(2, '0');
    const yearStr = run?.year || new Date().getFullYear();
    const empName = (record.employeeName || 'Employee').replace(/\s+/g, '_');
    const fileName = `Payslip_${empName}_${yearStr}_${monthStr}.pdf`;

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error('Payslip PDF generation error:', err);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
