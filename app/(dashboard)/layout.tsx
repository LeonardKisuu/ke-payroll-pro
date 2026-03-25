import { requireSession } from '@/lib/session-helpers';
import { db } from '@/lib/db';
import { organisations } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { DashboardShell } from '@/components/dashboard-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  const allOrgs = await db.query.organisations.findMany({
    where: eq(organisations.isActive, true),
  });

  const currentOrg = session.orgId
    ? allOrgs.find((o) => o.id === session.orgId) || null
    : allOrgs[0] || null;

  return (
    <DashboardShell
      session={session}
      organisations={allOrgs}
      currentOrg={currentOrg}
    >
      {children}
    </DashboardShell>
  );
}
