import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getSession, hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(id, 10)),
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    const body = await request.json();

    const updateData: Record<string, string | number | boolean | null> = {};

    if (body.fullName !== undefined) updateData.fullName = body.fullName || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.orgId !== undefined) updateData.orgId = body.orgId || null;
    if (body.employeeId !== undefined) updateData.employeeId = body.employeeId || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Handle password reset
    if (body.password) {
      updateData.passwordHash = await hashPassword(body.password);
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));

    const updated = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    const action = body.password ? 'password_reset' : 'update';
    await logAudit({
      userId: session.userId,
      action,
      entity: 'user',
      entityId: userId,
      details: body.password
        ? `Reset password for user #${userId}`
        : `Updated user fields: ${Object.keys(updateData).join(', ')}`,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);

    // Toggle active status
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await db.update(users).set({ isActive: !user.isActive }).where(eq(users.id, userId));

    await logAudit({
      userId: session.userId,
      action: user.isActive ? 'deactivate' : 'reactivate',
      entity: 'user',
      entityId: userId,
      details: `${user.isActive ? 'Deactivated' : 'Reactivated'} user: ${user.username}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
