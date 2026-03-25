import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payrollRecords, payrollRuns, employees, organisations } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { renderToBuffer } from '@react-pdf/renderer';
import { BulkPayslipDocument } from '@/lib/pdf-generator';
import type { PayslipData } from '@/lib/pdf-generator';
import React from 'react';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and accountant can download bulk payslips
    if (session.role === 'hr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const runId = parseInt(searchParams.get('runId') || '', 10);
    if (isNaN(runId)) {
      return NextResponse.json({ error: 'Missing or invalid runId' }, { status: 400 });
    }

    // Fetch the payroll run
    const run = await db.query.payrollRuns.findFirst({
      where: eq(payrollRuns.id, runId),
    });

    if (!run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    // Fetch organisation
    const org = await db.query.organisations.findFirst({
      where: eq(organisations.id, run.orgId),
    });

    // Fetch all payroll records for this run
    const records = await db.query.payrollRecords.findMany({
      where: eq(payrollRecords.runId, runId),
    });

    if (records.length === 0) {
      return NextResponse.json({ error: 'No records found for this payroll run' }, { status: 404 });
    }

    // Build payslip data for each employee
    const payslips: PayslipData[] = [];

    for (const record of records) {
      // Fetch employee details
      const employee = await db.query.employees.findFirst({
        where: eq(employees.id, record.employeeId),
      });

      // Parse custom deductions
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

      payslips.push({
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
        month: run.month,
        year: run.year,
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
      });
    }

    // Sort by employee number
    payslips.sort((a, b) => a.employeeNo.localeCompare(b.employeeNo));

    const buffer = await renderToBuffer(
      React.createElement(BulkPayslipDocument, { payslips }) as any
    );

    const MONTH_NAMES = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthStr = MONTH_NAMES[run.month] || String(run.month);
    const orgName = (org?.name || 'Org').replace(/\s+/g, '_');
    const fileName = `Payslips_${orgName}_${monthStr}_${run.year}.pdf`;

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error('Bulk payslip PDF generation error:', err);
    return NextResponse.json({ error: 'Failed to generate bulk payslips' }, { status: 500 });
  }
}
