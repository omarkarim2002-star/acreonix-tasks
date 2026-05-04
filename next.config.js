/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers on every response
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stop MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer policy — don't leak URL to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions — disable camera/mic/geolocation
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // HSTS — force HTTPS for 1 year
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // XSS protection (legacy browsers)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // DNS prefetch control
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + Next.js inline + Clerk
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.tasks.acreonix.co.uk https://challenges.cloudflare.com",
              // Styles: self + Google Fonts + inline
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Fonts
              "font-src 'self' https://fonts.gstatic.com",
              // Images: self + data URIs + Clerk avatars
              "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev",
              // API connections
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.stripe.com https://clerk.tasks.acreonix.co.uk https://*.clerk.accounts.dev",
              // Frames: Stripe + Clerk
              "frame-src https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com https://clerk.tasks.acreonix.co.uk",
              // Workers
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
      // API routes — add CORS protection
      {
        source: '/api/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },

  // Disable powered-by header (don't reveal tech stack)
  poweredByHeader: false,

  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
}

module.exports = nextConfig
