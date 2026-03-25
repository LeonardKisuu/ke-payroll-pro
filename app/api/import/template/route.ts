import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { employees } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

const EMPLOYEE_TEMPLATE_HEADERS = [
  'employee_no', 'full_name', 'id_number', 'kra_pin', 'nssf_no', 'nhif_no',
  'department', 'designation', 'date_of_joining', 'basic_salary',
  'house_allowance', 'commuter_allowance', 'car_allowance', 'other_allowances',
  'bonus_pay', 'leave_pay', 'leave_deduction', 'arrears',
  'airtime_benefit', 'internet_benefit', 'other_fringe_benefits',
  'bank_name', 'bank_branch', 'bank_account_no', 'bank_code', 'payment_method',
];

const OVERRIDE_HEADERS = [
  'employee_no', 'full_name', 'basic_salary', 'house_allowance',
  'commuter_allowance', 'car_allowance', 'other_allowances',
  'bonus_pay', 'leave_pay', 'leave_deduction', 'arrears',
  'airtime_benefit', 'internet_benefit', 'other_fringe_benefits',
];

function escapeCsvField(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(',');
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'accountant')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type');
    const orgId = parseInt(searchParams.get('orgId') || '', 10);

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    // Return JSON data for overrides diff computation
    if (type === 'overrides_data') {
      const emps = await db
        .select()
        .from(employees)
        .where(and(eq(employees.orgId, orgId), eq(employees.isActive, true)));

      const data = emps.map((e) => ({
        id: String(e.id),
        employee_no: e.employeeNo,
        full_name: e.fullName,
        basic_salary: String(e.basicSalary ?? 0),
        house_allowance: String(e.houseAllowance ?? 0),
        commuter_allowance: String(e.commuterAllowance ?? 0),
        car_allowance: String(e.carAllowance ?? 0),
        other_allowances: String(e.otherAllowances ?? 0),
        bonus_pay: String(e.bonusPay ?? 0),
        leave_pay: String(e.leavePay ?? 0),
        leave_deduction: String(e.leaveDeduction ?? 0),
        arrears: String(e.arrears ?? 0),
        airtime_benefit: String(e.airtimeBenefit ?? 0),
        internet_benefit: String(e.internetBenefit ?? 0),
        other_fringe_benefits: String(e.otherFringeBenefits ?? 0),
      }));

      return NextResponse.json(data);
    }

    if (type === 'employees') {
      // Empty template CSV with headers only
      const csv = EMPLOYEE_TEMPLATE_HEADERS.join(',') + '\n';
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="employee_import_template.csv"',
        },
      });
    }

    if (type === 'overrides') {
      // Pre-filled CSV with all current employees
      const emps = await db
        .select()
        .from(employees)
        .where(and(eq(employees.orgId, orgId), eq(employees.isActive, true)));

      const lines = [OVERRIDE_HEADERS.join(',')];

      emps.forEach((e) => {
        lines.push(
          toCsvRow([
            e.employeeNo,
            e.fullName,
            e.basicSalary ?? 0,
            e.houseAllowance ?? 0,
            e.commuterAllowance ?? 0,
            e.carAllowance ?? 0,
            e.otherAllowances ?? 0,
            e.bonusPay ?? 0,
            e.leavePay ?? 0,
            e.leaveDeduction ?? 0,
            e.arrears ?? 0,
            e.airtimeBenefit ?? 0,
            e.internetBenefit ?? 0,
            e.otherFringeBenefits ?? 0,
          ])
        );
      });

      const csv = lines.join('\n') + '\n';
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="monthly_overrides_template.csv"',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
