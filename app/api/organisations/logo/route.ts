import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organisations } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File | null;
    const orgId = parseInt(formData.get('orgId') as string || '', 10);

    if (!file || !orgId) {
      return NextResponse.json({ error: 'File and orgId are required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only PNG and JPEG images are allowed' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size must be under 2MB' }, { status: 400 });
    }

    // Convert to base64 data URI for storage
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // Update organisation logo
    const result = await db
      .update(organisations)
      .set({ logoUrl: dataUri })
      .where(eq(organisations.id, orgId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    return NextResponse.json({ logoUrl: dataUri });
  } catch (err) {
    console.error('Logo upload error:', err);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = parseInt(searchParams.get('orgId') || '', 10);

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    await db
      .update(organisations)
      .set({ logoUrl: null })
      .where(eq(organisations.id, orgId));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove logo' }, { status: 500 });
  }
}
