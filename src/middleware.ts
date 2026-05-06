import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/projects(.*)',
  '/api/tasks(.*)',
  '/api/extract-tasks(.*)',
  '/api/calendar-events(.*)',
  '/api/schedule(.*)',
  '/api/schedule-today(.*)',
  '/api/billing(.*)',
  '/api/preferences(.*)',
  '/api/insights(.*)',
  '/api/nudges(.*)',
  '/api/focus(.*)',
  '/api/export-tasks(.*)',
  '/api/push(.*)',
  '/api/dependencies(.*)',
])

export default clerkMiddleware((auth, req: NextRequest) => {
  // Allow Bearer token requests from mobile to pass through
  // Clerk's auth() on the route handler will validate the token
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) return NextResponse.next()

  if (isProtectedRoute(req)) auth().protect()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
