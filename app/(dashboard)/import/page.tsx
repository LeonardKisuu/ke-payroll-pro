import { requireAccountantOrAdmin } from '@/lib/session-helpers';
import { ImportClient } from './import-client';

export default async function ImportPage() {
  const session = await requireAccountantOrAdmin();

  if (!session.orgId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Please select an organisation first.</p>
      </div>
    );
  }

  return <ImportClient orgId={session.orgId} userId={session.userId} />;
}
