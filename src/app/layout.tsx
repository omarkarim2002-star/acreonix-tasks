import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { PostHogProvider } from '@/components/ui/PostHogProvider'
import { OnboardingEmailTrigger } from '@/components/ui/OnboardingEmailTrigger'
import './globals.css'

export const metadata: Metadata = {
  title: 'Acreonix Tasks',
  description: 'Smart task management and calendar organiser by Acreonix',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PostHogProvider>
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en">
        <body className="antialiased">
          <OnboardingEmailTrigger />
          {children}
        </body>
      </html>
    </ClerkProvider>
    </PostHogProvider>
  )
}
