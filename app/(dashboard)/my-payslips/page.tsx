import { requireSession } from '@/lib/session-helpers';
import { db } from '@/lib/db';
import { users, payrollRecords, payrollRuns, employees, organisations } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { MyPayslipsClient } from './my-payslips-client';

export default async function MyPayslipsPage() {
  const session = await requireSession();

  // Find the user record to get their linked employeeId
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user?.employeeId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Payslips</h1>
        <div className="text-center py-12 text-muted-foreground">
          <p>No employee record linked to your account.</p>
          <p className="text-sm mt-2">Please contact your administrator to link your employee profile.</p>
        </div>
      </div>
    );
  }

  // Find the employee record
  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, user.employeeId),
  });

  if (!employee) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Payslips</h1>
        <div className="text-center py-12 text-muted-foreground">
          <p>Employee record not found.</p>
        </div>
      </div>
    );
  }

  // Fetch all payroll records for this employee from finalised runs
  const records = await db
    .select({
      record: payrollRecords,
      runMonth: payrollRuns.month,
      runYear: payrollRuns.year,
      isFinal: payrollRuns.isFinal,
      runId: payrollRuns.id,
    })
    .from(payrollRecords)
    .innerJoin(payrollRuns, eq(payrollRecords.runId, payrollRuns.id))
    .where(
      and(
        eq(payrollRecords.employeeId, employee.id),
        eq(payrollRuns.isFinal, true)
      )
    )
    .orderBy(desc(payrollRuns.year), desc(payrollRuns.month));

  // Get org info for payslip display
  const org = await db.query.organisations.findFirst({
    where: eq(organisations.id, employee.orgId),
  });

  const payslips = records.map((r) => ({
    id: r.record.id,
    month: r.runMonth,
    year: r.runYear,
    grossPay: r.record.grossPay || 0,
    totalDeductions: r.record.totalDeductions || 0,
    netPay: r.record.netPay || 0,
    basicSalary: r.record.basicSalary || 0,
    houseAllowance: r.record.houseAllowance || 0,
    transportAllowance: r.record.transportAllowance || 0,
    otherAllowances: r.record.otherAllowances || 0,
    fringeBenefits: r.record.fringeBenefits || 0,
    nssfEmployee: r.record.nssfEmployee || 0,
    nssfEmployer: r.record.nssfEmployer || 0,
    shif: r.record.shif || 0,
    ahlEmployee: r.record.ahlEmployee || 0,
    ahlEmployer: r.record.ahlEmployer || 0,
    pensionRelief: r.record.pensionRelief || 0,
    taxableIncome: r.record.taxableIncome || 0,
    payeGrossTax: r.record.payeGrossTax || 0,
    personalRelief: r.record.personalRelief || 0,
    paye: r.record.paye || 0,
    customDeductionsJson: r.record.customDeductionsJson,
    customDeductionsTotal: r.record.customDeductionsTotal || 0,
    nita: r.record.nita || 0,
  }));

  return (
    <MyPayslipsClient
      payslips={payslips}
      employeeName={employee.fullName}
      employeeNo={employee.employeeNo}
      orgName={org?.name || 'Organisation'}
    />
  );
}
