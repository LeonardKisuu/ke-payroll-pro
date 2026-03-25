import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { employees } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const ALLOWED_FIELDS: Record<string, string> = {
  basic_salary: 'basicSalary',
  house_allowance: 'houseAllowance',
  commuter_allowance: 'commuterAllowance',
  car_allowance: 'carAllowance',
  other_allowances: 'otherAllowances',
  bonus_pay: 'bonusPay',
  leave_pay: 'leavePay',
  leave_deduction: 'leaveDeduction',
  arrears: 'arrears',
  airtime_benefit: 'airtimeBenefit',
  internet_benefit: 'internetBenefit',
  other_fringe_benefits: 'otherFringeBenefits',
  department: 'department',
  designation: 'designation',
  bank_name: 'bankName',
  bank_branch: 'bankBranch',
  bank_account_no: 'bankAccountNo',
  bank_code: 'bankCode',
  payment_method: 'paymentMethod',
  kra_pin: 'kraPin',
  nssf_no: 'nssfNo',
  nhif_no: 'nhifNo',
};

const NUMERIC_OVERRIDE_FIELDS = [
  'basic_salary', 'house_allowance', 'commuter_allowance', 'car_allowance',
  'other_allowances', 'bonus_pay', 'leave_pay', 'leave_deduction', 'arrears',
  'airtime_benefit', 'internet_benefit', 'other_fringe_benefits',
];

interface OverrideItem {
  employee_no: string;
  field: string;
  value: string | number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'accountant')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { overrides, orgId } = body as { overrides: OverrideItem[]; orgId: number };

    if (!overrides || !Array.isArray(overrides) || overrides.length === 0) {
      return NextResponse.json({ error: 'No overrides provided' }, { status: 400 });
    }

    let applied = 0;
    const errors: Array<{ row: number; message: string }> = [];

    // Group overrides by employee_no to batch updates
    const groupedByEmp = new Map<string, OverrideItem[]>();
    overrides.forEach((o) => {
      const key = o.employee_no?.trim();
      if (!key) return;
      if (!groupedByEmp.has(key)) groupedByEmp.set(key, []);
      groupedByEmp.get(key)!.push(o);
    });

    let rowCounter = 0;
    for (const [empNo, items] of groupedByEmp) {
      rowCounter++;
      try {
        // Find the employee
        const emp = await db.query.employees.findFirst({
          where: and(eq(employees.employeeNo, empNo), eq(employees.orgId, orgId)),
        });

        if (!emp) {
          items.forEach(() => {
            errors.push({ row: rowCounter, message: `Employee ${empNo} not found` });
          });
          continue;
        }

        // Build the update object
        const updateValues: Record<string, string | number> = {
          updatedAt: new Date().toISOString(),
        };

        for (const item of items) {
          const dbField = ALLOWED_FIELDS[item.field];
          if (!dbField) {
            errors.push({ row: rowCounter, message: `Invalid field: ${item.field}` });
            continue;
          }

          if (NUMERIC_OVERRIDE_FIELDS.includes(item.field)) {
            updateValues[dbField] = parseFloat(String(item.value)) || 0;
          } else {
            updateValues[dbField] = String(item.value).trim();
          }
        }

        await db.update(employees).set(updateValues).where(eq(employees.id, emp.id));

        await logAudit({
          userId: session.userId,
          action: 'override_apply',
          entity: 'employee',
          entityId: emp.id,
          details: `Applied ${items.length} override(s): ${items.map((i) => i.field).join(', ')}`,
          orgId,
        });

        applied += items.length;
      } catch (err) {
        errors.push({
          row: rowCounter,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({ applied, errors });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
