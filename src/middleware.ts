// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { betterFetch } from '@better-fetch/fetch';
import { SessionResponse } from '@/types/auth';

export async function middleware(request: NextRequest) {
  const { data: session } = await betterFetch<SessionResponse>('/api/auth/get-session', {
    baseURL: request.nextUrl.origin,
    headers: {
      cookie: request.headers.get('cookie') || '', // Forward the cookies from the request
    },
  });

  const pathname = request.nextUrl.pathname;

  // If no session exists, redirect to login for all protected routes
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { user } = session;

  // Check if user is trying to access admin routes
  if (pathname.startsWith('/admin')|| pathname.startsWith('/report')) {
    // Only allow admin users to access admin routes
    if (user.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // For all other protected routes, just being logged in is sufficient
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|$).*)'],
};
