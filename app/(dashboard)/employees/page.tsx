import { requireAccountantOrAdmin } from '@/lib/session-helpers';
import { db } from '@/lib/db';
import { employees } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { EmployeesClient } from './employees-client';

export default async function EmployeesPage() {
  const session = await requireAccountantOrAdmin();

  if (!session.orgId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Please select an organisation first.</p>
      </div>
    );
  }

  const allEmployees = await db
    .select()
    .from(employees)
    .where(eq(employees.orgId, session.orgId))
    .orderBy(employees.employeeNo);

  return <EmployeesClient employees={allEmployees} role={session.role} />;
}
