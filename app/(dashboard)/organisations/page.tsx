import { requireAdmin } from '@/lib/session-helpers';
import { db } from '@/lib/db';
import { organisations } from '@/drizzle/schema';
import { OrganisationsClient } from './organisations-client';

export default async function OrganisationsPage() {
  await requireAdmin();

  const orgs = await db.select().from(organisations);

  return <OrganisationsClient organisations={orgs} />;
}
