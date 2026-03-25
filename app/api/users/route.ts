import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/drizzle/schema';
import { getSession } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const allUsers = await db.select().from(users);
    return NextResponse.json(allUsers);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, fullName, email, role, orgId, employeeId } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    if (!['admin', 'accountant', 'hr'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const result = await db.insert(users).values({
      username: username.trim(),
      passwordHash,
      fullName: fullName || null,
      email: email || null,
      role,
      orgId: orgId || null,
      employeeId: employeeId || null,
      isActive: true,
      createdAt: new Date().toISOString(),
    }).returning();

    const newUser = result[0];

    await logAudit({
      userId: session.userId,
      action: 'create',
      entity: 'user',
      entityId: newUser.id,
      details: `Created user: ${username} (${role})`,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
