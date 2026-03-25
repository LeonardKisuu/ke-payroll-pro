import { requireAdmin } from '@/lib/session-helpers';
import { db } from '@/lib/db';
import { users, organisations } from '@/drizzle/schema';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const session = await requireAdmin();

  const allUsers = await db.select().from(users);
  const allOrgs = await db.select().from(organisations);

  return (
    <SettingsClient
      users={allUsers}
      organisations={allOrgs}
      currentOrgId={session.orgId}
    />
  );
}
