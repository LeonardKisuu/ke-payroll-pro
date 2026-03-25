import { requireAccountantOrAdmin } from '@/lib/session-helpers';
import { RunPayrollClient } from './run-payroll-client';

export default async function RunPayrollPage() {
  const session = await requireAccountantOrAdmin();

  if (!session.orgId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Please select an organisation first.</p>
      </div>
    );
  }

  return <RunPayrollClient orgId={session.orgId} role={session.role} />;
}
