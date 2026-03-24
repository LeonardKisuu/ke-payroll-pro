import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ke-payroll-pro-dev-secret-change-in-production'
);
const COOKIE_NAME = 'ke-payroll-session';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth/login', '/api/auth/register'];

const ROLE_ACCESS: Record<string, string[]> = {
  admin: ['*'],
  accountant: ['/dashboard', '/employees', '/run-payroll', '/reports', '/exports', '/import', '/organisations', '/my-payslips', '/custom-deductions'],
  hr: ['/my-payslips', '/dashboard'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/logo') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    // Check role-based access
    const allowedPaths = ROLE_ACCESS[role];
    if (!allowedPaths) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (allowedPaths.includes('*')) {
      return NextResponse.next();
    }

    // Check if current path is allowed
    const isAllowed = allowedPaths.some(p => pathname.startsWith(p));
    if (!isAllowed && pathname !== '/') {
      // Redirect to appropriate default page
      if (role === 'hr') {
        return NextResponse.redirect(new URL('/my-payslips', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
