import { getSession } from './auth';
import { redirect } from 'next/navigation';

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== 'admin') redirect('/dashboard');
  return session;
}

export async function requireAccountantOrAdmin() {
  const session = await requireSession();
  if (session.role !== 'admin' && session.role !== 'accountant') redirect('/my-payslips');
  return session;
}
