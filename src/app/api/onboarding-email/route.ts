import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { firstName, email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // ── Check if already sent — stored in Supabase so it persists across all devices ──
  const { data: existing } = await supabaseAdmin
    .from('user_preferences')
    .select('welcome_email_sent')
    .eq('user_id', userId)
    .single()

  if (existing?.welcome_email_sent) {
    // Already sent — return 200 so client caches the flag locally
    return NextResponse.json({ ok: true, skipped: true })
  }

  // ── Send welcome email ────────────────────────────────────────────────────
  try {
    await resend.emails.send({
      from:    'Acreonix Tasks <hello@acreonix.co.uk>',
      to:      email,
      subject: `Welcome to Acreonix Tasks, ${firstName || 'there'} 👋`,
      html: `
        <div style="font-family: DM Sans, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <div style="margin-bottom: 32px;">
            <span style="font-size: 13px; font-weight: 800; letter-spacing: 2px; color: #2d7a4f;">ACREONIX</span>
            <span style="font-size: 9px; font-weight: 600; letter-spacing: 4px; color: #c9a84c; margin-left: 6px;">TASKS</span>
          </div>
          <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 12px;">
            Welcome${firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p style="font-size: 16px; color: #888; line-height: 1.6; margin-bottom: 24px;">
            Your clarity system is ready. Here's how to get the most out of it in the first 5 minutes.
          </p>
          <div style="background: #f0faf4; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
            <p style="font-weight: 700; margin-bottom: 12px; font-size: 14px;">Start here:</p>
            <p style="margin-bottom: 8px; font-size: 14px;">✦ <strong>AI Extract</strong> — paste an email or speak out loud. AI pulls out every task.</p>
            <p style="margin-bottom: 8px; font-size: 14px;">⬡ <strong>AI Schedule</strong> — tap "Plan today" in the Calendar tab. Your day is built instantly.</p>
            <p style="margin-bottom: 0; font-size: 14px;">📁 <strong>Projects</strong> — group your tasks so you always know what belongs where.</p>
          </div>
          <a href="https://tasks.acreonix.co.uk/dashboard" style="display: inline-block; background: #2d7a4f; color: #fff; padding: 13px 24px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; margin-bottom: 32px;">
            Open Acreonix Tasks →
          </a>
          <p style="font-size: 12px; color: #bbb; line-height: 1.6;">
            You're receiving this because you signed up at tasks.acreonix.co.uk.<br>
            <a href="https://tasks.acreonix.co.uk" style="color: #bbb;">Unsubscribe</a>
          </p>
        </div>
      `,
    })
  } catch (e) {
    console.error('Welcome email failed:', e)
    // Don't fail the request — just log it
  }

  // ── Mark as sent in Supabase ──────────────────────────────────────────────
  await supabaseAdmin
    .from('user_preferences')
    .upsert({ user_id: userId, welcome_email_sent: true }, { onConflict: 'user_id' })

  return NextResponse.json({ ok: true })
}
