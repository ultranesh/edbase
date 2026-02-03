import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  const isClassroom = hostname.startsWith('classroom.');

  // classroom.ertis.academy root → redirect to /login
  if (isClassroom && pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ertis.academy (without classroom subdomain) → block all app routes
  if (!isClassroom && pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (static files, images, etc.)
     * - api routes
     * - static files (favicon, logos, etc.)
     */
    '/((?!_next|api|logos|favicon|.*\\.).*)',
  ],
};
