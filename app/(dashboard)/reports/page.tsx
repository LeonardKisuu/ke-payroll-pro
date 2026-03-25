import { requireAccountantOrAdmin } from '@/lib/session-helpers';
import { ReportsClient } from './reports-client';

export default async function ReportsPage() {
  const session = await requireAccountantOrAdmin();

  if (!session.orgId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Please select an organisation first.</p>
      </div>
    );
  }

  return <ReportsClient orgId={session.orgId} />;
}
