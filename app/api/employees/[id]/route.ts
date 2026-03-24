import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { employees, employeeCustomDeductions, customDeductions } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
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
    const empId = parseInt(id, 10);
    if (isNaN(empId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, empId),
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const deductions = await db
      .select({
        id: employeeCustomDeductions.id,
        deductionId: employeeCustomDeductions.deductionId,
        amount: employeeCustomDeductions.amount,
        isActive: employeeCustomDeductions.isActive,
        name: customDeductions.name,
        deductionType: customDeductions.deductionType,
        isPensionContribution: customDeductions.isPensionContribution,
        isEmployerCost: customDeductions.isEmployerCost,
      })
      .from(employeeCustomDeductions)
      .innerJoin(customDeductions, eq(employeeCustomDeductions.deductionId, customDeductions.id))
      .where(eq(employeeCustomDeductions.employeeId, empId));

    return NextResponse.json({ ...employee, customDeductions: deductions });
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
    const empId = parseInt(id, 10);
    if (isNaN(empId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const now = new Date().toISOString();

    const result = await db
      .update(employees)
      .set({
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
        transportAllowance: Number(body.transportAllowance) || 0,
        otherAllowances: Number(body.otherAllowances) || 0,
        airtimeBenefit: Number(body.airtimeBenefit) || 0,
        internetBenefit: Number(body.internetBenefit) || 0,
        otherFringeBenefits: Number(body.otherFringeBenefits) || 0,
        bankName: body.bankName || null,
        bankBranch: body.bankBranch || null,
        bankAccountNo: body.bankAccountNo || null,
        bankCode: body.bankCode || null,
        paymentMethod: body.paymentMethod || 'bank_transfer',
        isActive: body.isActive ?? true,
        updatedAt: now,
      })
      .where(eq(employees.id, empId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Update custom deductions if provided
    if (body.customDeductions && Array.isArray(body.customDeductions)) {
      // Remove old assignments
      await db
        .delete(employeeCustomDeductions)
        .where(eq(employeeCustomDeductions.employeeId, empId));

      // Insert new
      for (const ded of body.customDeductions) {
        if (ded.deductionId && ded.amount > 0) {
          await db.insert(employeeCustomDeductions).values({
            employeeId: empId,
            deductionId: ded.deductionId,
            amount: Number(ded.amount),
            isActive: ded.isActive ?? true,
          });
        }
      }
    }

    await logAudit({
      userId: session.userId,
      action: 'update',
      entity: 'employee',
      entityId: empId,
      details: `Updated employee: ${result[0].fullName} (${result[0].employeeNo})`,
      orgId: session.orgId || undefined,
    });

    return NextResponse.json(result[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'Duplicate ID number or KRA PIN' },
        { status: 409 }
      );
    }
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
    const empId = parseInt(id, 10);
    if (isNaN(empId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const result = await db
      .update(employees)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(employees.id, empId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    await logAudit({
      userId: session.userId,
      action: 'deactivate',
      entity: 'employee',
      entityId: empId,
      details: `Deactivated employee: ${result[0].fullName} (${result[0].employeeNo})`,
      orgId: session.orgId || undefined,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
