import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { employees } from '@/drizzle/schema';
import { eq, and, or, like, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const activeOnly = searchParams.get('active') !== 'false';
    const orgId = session.orgId;

    if (!orgId) {
      return NextResponse.json({ error: 'No organisation selected' }, { status: 400 });
    }

    const conditions = [eq(employees.orgId, orgId)];

    if (activeOnly) {
      conditions.push(eq(employees.isActive, true));
    }

    if (department) {
      conditions.push(eq(employees.department, department));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          like(employees.fullName, pattern),
          like(employees.employeeNo, pattern),
          like(employees.idNumber, pattern),
          like(employees.kraPin, pattern),
        )!
      );
    }

    const results = await db
      .select()
      .from(employees)
      .where(and(...conditions))
      .orderBy(employees.employeeNo);

    return NextResponse.json(results);
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

    if (!body.employeeNo || !body.fullName || !body.idNumber) {
      return NextResponse.json(
        { error: 'Employee number, full name, and ID number are required' },
        { status: 400 }
      );
    }

    const existing = await db.query.employees.findFirst({
      where: and(
        eq(employees.idNumber, body.idNumber),
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An employee with this ID number already exists' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const result = await db.insert(employees).values({
      employeeNo: body.employeeNo,
      fullName: body.fullName,
      idNumber: body.idNumber,
      kraPin: body.kraPin || null,
      nssfNo: body.nssfNo || null,
      nhifNo: body.nhifNo || null,
      department: body.department || null,
      designation: body.designation || null,
      dateOfJoining: body.dateOfJoining || null,
      basicSalary: Number(body.basicSalary) || 0,
      houseAllowance: Number(body.houseAllowance) || 0,
      commuterAllowance: Number(body.commuterAllowance) || 0,
      carAllowance: Number(body.carAllowance) || 0,
      otherAllowances: Number(body.otherAllowances) || 0,
      bonusPay: Number(body.bonusPay) || 0,
      leavePay: Number(body.leavePay) || 0,
      leaveDeduction: Number(body.leaveDeduction) || 0,
      arrears: Number(body.arrears) || 0,
      airtimeBenefit: Number(body.airtimeBenefit) || 0,
      internetBenefit: Number(body.internetBenefit) || 0,
      otherFringeBenefits: Number(body.otherFringeBenefits) || 0,
      bankName: body.bankName || null,
      bankBranch: body.bankBranch || null,
      bankAccountNo: body.bankAccountNo || null,
      bankCode: body.bankCode || null,
      paymentMethod: body.paymentMethod || 'bank_transfer',
      orgId: session.orgId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const newEmp = result[0];

    await logAudit({
      userId: session.userId,
      action: 'create',
      entity: 'employee',
      entityId: newEmp.id,
      details: `Created employee: ${newEmp.fullName} (${newEmp.employeeNo})`,
      orgId: session.orgId,
    });

    return NextResponse.json(newEmp, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    if (message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'An employee with this ID number or KRA PIN already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
