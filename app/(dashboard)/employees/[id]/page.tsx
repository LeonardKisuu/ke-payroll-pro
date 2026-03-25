import { requireAccountantOrAdmin } from '@/lib/session-helpers';
import { db } from '@/lib/db';
import { employees, customDeductions, employeeCustomDeductions } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { EmployeeForm } from '@/components/employee-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailPage({ params }: Props) {
  const session = await requireAccountantOrAdmin();
  const { id } = await params;

  if (!session.orgId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Please select an organisation first.</p>
      </div>
    );
  }

  // Fetch org custom deductions
  const orgDeductions = await db
    .select()
    .from(customDeductions)
    .where(eq(customDeductions.orgId, session.orgId))
    .orderBy(customDeductions.name);

  if (id === 'new') {
    return (
      <EmployeeForm
        isNew={true}
        orgDeductions={orgDeductions}
      />
    );
  }

  const empId = parseInt(id, 10);
  if (isNaN(empId)) notFound();

  const employee = await db.query.employees.findFirst({
    where: and(eq(employees.id, empId), eq(employees.orgId, session.orgId)),
  });

  if (!employee) notFound();

  // Fetch employee's custom deduction assignments
  const empDeductions = await db
    .select({
      deductionId: employeeCustomDeductions.deductionId,
      amount: employeeCustomDeductions.amount,
      isActive: employeeCustomDeductions.isActive,
    })
    .from(employeeCustomDeductions)
    .where(eq(employeeCustomDeductions.employeeId, empId));

  return (
    <EmployeeForm
      isNew={false}
      employee={{ ...employee, customDeductions: empDeductions }}
      orgDeductions={orgDeductions}
    />
  );
}
