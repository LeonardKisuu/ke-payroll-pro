import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organisations } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allOrgs = await db.query.organisations.findMany({
      where: eq(organisations.isActive, true),
    });

    return NextResponse.json(allOrgs);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, kraPin, address, contactEmail, contactPhone, primaryColor, secondaryColor } = body;

    if (!name) {
      return NextResponse.json({ error: 'Organisation name is required' }, { status: 400 });
    }

    const result = await db.insert(organisations).values({
      name,
      kraPin: kraPin || null,
      address: address || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      primaryColor: primaryColor || '#1B3A6B',
      secondaryColor: secondaryColor || '#C9A046',
      isActive: true,
      createdAt: new Date().toISOString(),
    }).returning();

    const newOrg = result[0];

    await logAudit({
      userId: session.userId,
      action: 'create',
      entity: 'organisation',
      entityId: newOrg.id,
      details: `Created organisation: ${name}`,
      orgId: newOrg.id,
    });

    return NextResponse.json(newOrg, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
