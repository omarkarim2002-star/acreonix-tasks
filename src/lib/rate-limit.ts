import { supabaseAdmin } from './supabase'

type RateLimitConfig = {
  windowSeconds: number   // time window
  maxRequests: number     // max calls in window
}

// Per-route limits
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Heavy AI routes — Claude calls
  'extract-preview':    { windowSeconds: 60,   maxRequests: 5  },  // 5/min
  'extract-confirm':    { windowSeconds: 60,   maxRequests: 5  },  // 5/min
  'prioritise-today':   { windowSeconds: 60,   maxRequests: 10 },  // 10/min
  'schedule':           { windowSeconds: 60,   maxRequests: 5  },  // 5/min
  'schedule-today':     { windowSeconds: 60,   maxRequests: 5  },  // 5/min
  'behaviour-insights': { windowSeconds: 300,  maxRequests: 3  },  // 3 per 5 min
  'daily-checkin':      { windowSeconds: 3600, maxRequests: 10 },  // 10/hr
  'insights':           { windowSeconds: 60,   maxRequests: 10 },  // 10/min
  'calendar-import':    { windowSeconds: 60,   maxRequests: 5  },  // 5/min
  // Default for unlisted routes
  'default':            { windowSeconds: 60,   maxRequests: 30 },
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number; message: string }

export async function checkRateLimit(
  userId: string,
  route: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[route] ?? RATE_LIMITS.default
  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)
  const key = `${userId}:${route}`

  try {
    // Count requests in window
    const { count, error } = await supabaseAdmin
      .from('rate_limit_log')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart.toISOString())

    if (error) {
      // If table doesn't exist yet, allow through
      console.warn('[rate-limit] Table not ready:', error.message)
      return { allowed: true }
    }

    if ((count ?? 0) >= config.maxRequests) {
      return {
        allowed: false,
        retryAfter: config.windowSeconds,
        message: `Too many requests. Try again in ${config.windowSeconds < 60 ? `${config.windowSeconds}s` : `${Math.ceil(config.windowSeconds / 60)}m`}.`,
      }
    }

    // Log this request (fire and forget — don't block on it)
    // Fire and forget — wrap in Promise.resolve for proper Promise typing
    void Promise.resolve(
      supabaseAdmin.from('rate_limit_log').insert({ key, user_id: userId, route })
    ).catch(() => {})

    // Cleanup old entries occasionally
    if (Math.random() < 0.05) {
      const cutoff = new Date(now.getTime() - 3600 * 1000)
      void Promise.resolve(
        supabaseAdmin.from('rate_limit_log').delete().lt('created_at', cutoff.toISOString())
      ).catch(() => {})
    }

    return { allowed: true }
  } catch {
    // Never block on rate limit errors
    return { allowed: true }
  }
}

// Helper to return a 429 response
export function rateLimitResponse(result: Extract<RateLimitResult, { allowed: false }>) {
  return new Response(
    JSON.stringify({ error: result.message, retryAfter: result.retryAfter }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter),
        'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + result.retryAfter),
      },
    }
  )
}
