import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tasks.acreonix.co.uk'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Acreonix Tasks — AI that organises your work',
    template: '%s | Acreonix Tasks',
  },
  description: 'Paste anything. AI structures your tasks, schedules your week, and tells you exactly what to do next. Free to start.',
  keywords: ['task management', 'AI scheduling', 'productivity', 'to-do', 'project management', 'AI tasks', 'smart calendar'],
  authors: [{ name: 'Acreonix Ltd', url: 'https://acreonix.co.uk' }],
  creator: 'Acreonix Ltd',
  publisher: 'Acreonix Ltd',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: APP_URL,
    siteName: 'Acreonix Tasks',
    title: 'Acreonix Tasks — AI that organises your work',
    description: 'Paste anything. AI structures your tasks, schedules your week, and tells you exactly what to do next.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Acreonix Tasks' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Acreonix Tasks — AI that organises your work',
    description: 'Paste anything. AI handles the rest.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2d7a4f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={dmSans.variable}>
        <body className={dmSans.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
