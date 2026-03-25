import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payrollRecords, payrollRuns, employees, organisations } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { renderToBuffer } from '@react-pdf/renderer';
import { P9Document, BulkP9Document } from '@/lib/pdf-generator';
import type { P9Data } from '@/lib/pdf-generator';
import React from 'react';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'hr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '', 10);
    const orgId = parseInt(searchParams.get('orgId') || '', 10);
    const employeeId = searchParams.get('employeeId'); // optional — if omitted, generate for all

    if (isNaN(year) || isNaN(orgId)) {
      return NextResponse.json({ error: 'Missing or invalid year/orgId' }, { status: 400 });
    }

    // Fetch organisation
    const org = await db.query.organisations.findFirst({
      where: eq(organisations.id, orgId),
    });

    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    // Fetch all payroll runs for this year and org
    const runs = await db.query.payrollRuns.findMany({
      where: and(
        eq(payrollRuns.year, year),
        eq(payrollRuns.orgId, orgId),
      ),
    });

    if (runs.length === 0) {
      return NextResponse.json({ error: `No payroll runs found for year ${year}` }, { status: 404 });
    }

    const runIds = runs.map((r) => r.id);

    // Fetch all payroll records for these runs
    let allRecords = [];
    for (const rid of runIds) {
      const recs = await db.query.payrollRecords.findMany({
        where: eq(payrollRecords.runId, rid),
      });
      allRecords.push(...recs);
    }

    // Create a map: runId → month
    const runMonthMap: Record<number, number> = {};
    for (const r of runs) {
      runMonthMap[r.id] = r.month;
    }

    // Group records by employee
    const employeeMap: Record<number, typeof allRecords> = {};
    for (const rec of allRecords) {
      if (!employeeMap[rec.employeeId]) {
        employeeMap[rec.employeeId] = [];
      }
      employeeMap[rec.employeeId].push(rec);
    }

    // If specific employee requested, filter
    let targetEmployeeIds: number[];
    if (employeeId && employeeId !== 'all') {
      const eid = parseInt(employeeId, 10);
      if (isNaN(eid) || !employeeMap[eid]) {
        return NextResponse.json({ error: 'Employee not found or no records for this year' }, { status: 404 });
      }
      targetEmployeeIds = [eid];
    } else {
      targetEmployeeIds = Object.keys(employeeMap).map(Number);
    }

    // Build P9 data for each employee
    const p9DataList: P9Data[] = [];

    for (const eid of targetEmployeeIds) {
      const emp = await db.query.employees.findFirst({
        where: eq(employees.id, eid),
      });

      if (!emp) continue;

      const recs = employeeMap[eid] || [];

      // Build monthly data sorted by month
      const monthlyData = recs
        .map((r) => ({
          month: runMonthMap[r.runId] || 1,
          basicSalary: r.basicSalary || 0,
          houseAllowance: r.houseAllowance || 0,
          transportAllowance: r.transportAllowance || 0,
          otherAllowances: r.otherAllowances || 0,
          grossPay: r.grossPay || 0,
          nssfEmployee: r.nssfEmployee || 0,
          pensionContributions: r.pensionContributions || 0,
          pensionRelief: r.pensionRelief || 0,
          taxableIncome: r.taxableIncome || 0,
          payeGrossTax: r.payeGrossTax || 0,
          personalRelief: r.personalRelief || 0,
          paye: r.paye || 0,
        }))
        .sort((a, b) => a.month - b.month);

      p9DataList.push({
        orgName: org.name,
        orgKraPin: org.kraPin || undefined,
        primaryColor: org.primaryColor || '#1B3A6B',
        secondaryColor: org.secondaryColor || '#C9A046',
        employeeName: emp.fullName,
        employeeNo: emp.employeeNo,
        kraPin: emp.kraPin || '',
        idNumber: emp.idNumber,
        year,
        monthlyData,
      });
    }

    if (p9DataList.length === 0) {
      return NextResponse.json({ error: 'No P9 data to generate' }, { status: 404 });
    }

    // Sort by employee number
    p9DataList.sort((a, b) => a.employeeNo.localeCompare(b.employeeNo));

    let buffer: Uint8Array;
    let fileName: string;

    if (p9DataList.length === 1) {
      // Single employee P9
      buffer = await renderToBuffer(
        React.createElement(P9Document, { data: p9DataList[0] }) as any
      );
      const empName = p9DataList[0].employeeName.replace(/\s+/g, '_');
      fileName = `P9_${empName}_${year}.pdf`;
    } else {
      // Bulk P9 — all employees in one PDF
      buffer = await renderToBuffer(
        React.createElement(BulkP9Document, { employees: p9DataList }) as any
      );
      const orgName = org.name.replace(/\s+/g, '_');
      fileName = `P9_All_Employees_${orgName}_${year}.pdf`;
    }

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error('P9 generation error:', err);
    return NextResponse.json({ error: 'Failed to generate P9' }, { status: 500 });
  }
}
