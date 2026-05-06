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
  '/api/dependencies(.*)',
  '/api/push(.*)',
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) return NextResponse.next()
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
