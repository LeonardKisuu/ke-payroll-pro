import { requireAdmin } from '@/lib/session-helpers';
import { AuditClient } from './audit-client';

export default async function AuditPage() {
  const session = await requireAdmin();

  return <AuditClient orgId={session.orgId} />;
}
