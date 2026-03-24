import { requireAccountantOrAdmin } from '@/lib/session-helpers';
import { ExportsClient } from './exports-client';

export default async function ExportsPage() {
  const session = await requireAccountantOrAdmin();

  if (!session.orgId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Please select an organisation first.</p>
      </div>
    );
  }

  return <ExportsClient orgId={session.orgId} />;
}
