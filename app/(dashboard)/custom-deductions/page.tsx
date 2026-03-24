import { requireAccountantOrAdmin } from '@/lib/session-helpers';
import { db } from '@/lib/db';
import { customDeductions } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { CustomDeductionsClient } from './custom-deductions-client';

export default async function CustomDeductionsPage() {
  const session = await requireAccountantOrAdmin();

  if (!session.orgId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Please select an organisation first.</p>
      </div>
    );
  }

  const deductions = await db
    .select()
    .from(customDeductions)
    .where(eq(customDeductions.orgId, session.orgId))
    .orderBy(customDeductions.name);

  return <CustomDeductionsClient deductions={deductions} role={session.role} />;
}
