import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { readFileSync } from 'fs'
import { join } from 'path'

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard/extract')
  redirect('/landing.html')
}
