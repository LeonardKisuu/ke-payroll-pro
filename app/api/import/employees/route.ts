import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { employees } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const REQUIRED_FIELDS = ['employee_no', 'full_name', 'id_number', 'basic_salary'];

const FIELD_MAP: Record<string, string> = {
  employee_no: 'employeeNo',
  full_name: 'fullName',
  id_number: 'idNumber',
  kra_pin: 'kraPin',
  nssf_no: 'nssfNo',
  nhif_no: 'nhifNo',
  department: 'department',
  designation: 'designation',
  date_of_joining: 'dateOfJoining',
  basic_salary: 'basicSalary',
  house_allowance: 'houseAllowance',
  transport_allowance: 'transportAllowance',
  other_allowances: 'otherAllowances',
  airtime_benefit: 'airtimeBenefit',
  internet_benefit: 'internetBenefit',
  other_fringe_benefits: 'otherFringeBenefits',
  bank_name: 'bankName',
  bank_branch: 'bankBranch',
  bank_account_no: 'bankAccountNo',
  bank_code: 'bankCode',
  payment_method: 'paymentMethod',
};

const NUMERIC_FIELDS = [
  'basic_salary', 'house_allowance', 'transport_allowance', 'other_allowances',
  'airtime_benefit', 'internet_benefit', 'other_fringe_benefits',
];

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'accountant')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { employees: rows, orgId } = body as {
      employees: Record<string, string | number>[];
      orgId: number;
    };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No employee data provided' }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        // Validate required fields
        const missing = REQUIRED_FIELDS.filter((f) => !row[f] || String(row[f]).trim() === '');
        if (missing.length > 0) {
          errors.push({ row: rowNum, message: `Missing: ${missing.join(', ')}` });
          continue;
        }

        // Build the employee values object
        const values: Record<string, string | number | boolean | null> = {
          orgId,
          isActive: true,
          updatedAt: new Date().toISOString(),
        };

        Object.entries(FIELD_MAP).forEach(([csvKey, dbKey]) => {
          const rawVal = row[csvKey];
          if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
            if (NUMERIC_FIELDS.includes(csvKey)) {
              values[dbKey] = 0;
            }
            return;
          }
          if (NUMERIC_FIELDS.includes(csvKey)) {
            values[dbKey] = parseFloat(String(rawVal)) || 0;
          } else {
            values[dbKey] = String(rawVal).trim();
          }
        });

        const idNumber = String(row.id_number).trim();

        // Check if employee with this id_number exists in this org
        const existing = await db.query.employees.findFirst({
          where: and(eq(employees.idNumber, idNumber), eq(employees.orgId, orgId)),
        });

        if (existing) {
          // Update existing employee
          await db
            .update(employees)
            .set(values)
            .where(eq(employees.id, existing.id));

          await logAudit({
            userId: session.userId,
            action: 'import_update',
            entity: 'employee',
            entityId: existing.id,
            details: `Updated via CSV import (row ${rowNum})`,
            orgId,
          });

          updated++;
        } else {
          // Insert new employee
          values.createdAt = new Date().toISOString();

          const result = await db.insert(employees).values(values as typeof employees.$inferInsert).returning({ id: employees.id });

          await logAudit({
            userId: session.userId,
            action: 'import_create',
            entity: 'employee',
            entityId: result[0]?.id,
            details: `Created via CSV import (row ${rowNum})`,
            orgId,
          });

          imported++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        // Handle unique constraint violations gracefully
        if (message.includes('UNIQUE') && message.includes('kra_pin')) {
          errors.push({ row: rowNum, message: 'Duplicate KRA PIN' });
        } else if (message.includes('UNIQUE')) {
          errors.push({ row: rowNum, message: 'Duplicate unique field' });
        } else {
          errors.push({ row: rowNum, message });
        }
      }
    }

    return NextResponse.json({ imported, updated, errors });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
