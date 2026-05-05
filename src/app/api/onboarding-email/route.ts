import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { firstName, email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const name = firstName || 'there'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const { subject, html } = welcomeEmail({ name, email, appUrl })
  const result = await sendEmail({ to: email, subject, html })

  return NextResponse.json({ sent: result.success })
}

function welcomeEmail({ name, email, appUrl }: { name: string; email: string; appUrl: string }) {
  return {
    subject: `Welcome to Acreonix Tasks, ${name} 👋`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8faf9;font-family:'DM Sans',-apple-system,sans-serif">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07)">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#2d7a4f,#1f5537);padding:32px;text-align:center">
    <img src="${appUrl}/logo.png" width="36" height="36" alt="Acreonix" style="border-radius:8px;vertical-align:middle;margin-right:10px">
    <span style="color:#fff;font-size:20px;font-weight:700;vertical-align:middle;letter-spacing:0.08em;font-family:Georgia,serif">ACREONIX</span>
    <span style="color:#c9a84c;font-size:11px;font-weight:600;vertical-align:middle;margin-left:6px;letter-spacing:0.15em;font-family:Georgia,serif">TASKS</span>
    <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:12px 0 0">Your AI clarity system is ready</p>
  </div>

  <!-- Body -->
  <div style="padding:32px">
    <h1 style="font-size:22px;font-weight:600;color:#1a1a1a;letter-spacing:-0.02em;margin:0 0 12px">
      Hey ${name}, welcome aboard 👋
    </h1>
    <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px">
      You've joined a smarter way to manage work. Acreonix Tasks isn't just another scheduler — it helps you <strong>understand</strong> your workload first, then guides you through it step by step.
    </p>

    <!-- Steps -->
    <div style="background:#f9fdf9;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="font-size:11px;font-weight:700;color:#2d7a4f;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px">Your quick-start checklist</p>
      ${[
        { n: 1, title: 'Add your first tasks', desc: 'Paste a brain dump, email, or speak it aloud. AI extracts everything.', href: `${appUrl}/dashboard/extract`, cta: 'Add tasks with AI' },
        { n: 2, title: 'Set your work hours', desc: 'Tells AI when to schedule — so it never books you at midnight.', href: `${appUrl}/dashboard/account`, cta: 'Set work hours' },
        { n: 3, title: 'Get your daily focus', desc: 'Dashboard shows your top tasks ranked by AI every morning.', href: `${appUrl}/dashboard`, cta: 'Open dashboard' },
        { n: 4, title: 'Schedule your week', desc: 'AI builds an optimised calendar plan — or import from Google/Outlook.', href: `${appUrl}/dashboard/calendar`, cta: 'Open calendar' },
      ].map(s => `
        <div style="display:flex;gap:14px;margin-bottom:${s.n < 4 ? '16px' : '0'}">
          <div style="width:26px;height:26px;border-radius:50%;background:#2d7a4f;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;line-height:26px;text-align:center">${s.n}</div>
          <div style="flex:1">
            <p style="font-size:13.5px;font-weight:600;color:#1a1a1a;margin:0 0 3px">${s.title}</p>
            <p style="font-size:12px;color:#888;margin:0 0 6px;line-height:1.5">${s.desc}</p>
            <a href="${s.href}" style="font-size:12px;color:#2d7a4f;font-weight:600;text-decoration:none">${s.cta} →</a>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- What's new highlights -->
    <p style="font-size:11px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px">What makes us different</p>
    ${[
      { icon: '🎤', text: 'Voice input — speak your tasks instead of typing' },
      { icon: '📅', text: 'Calendar import — AI schedules around your existing events' },
      { icon: '🧠', text: 'Daily check-in — AI reviews yesterday and plans today' },
      { icon: '📊', text: 'Behaviour insights — learns your patterns over 4 weeks' },
    ].map(f => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="font-size:18px">${f.icon}</span>
        <span style="font-size:13px;color:#555">${f.text}</span>
      </div>
    `).join('')}

    <!-- CTA -->
    <div style="text-align:center;margin-top:28px">
      <a href="${appUrl}/dashboard" style="display:inline-block;background:#2d7a4f;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;box-shadow:0 4px 14px rgba(45,122,79,0.3)">
        Open Acreonix Tasks →
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="padding:20px 32px;border-top:1px solid #f0f0ee;text-align:center">
    <p style="font-size:12px;color:#bbb;margin:0">
      Acreonix Tasks · <a href="${appUrl}" style="color:#2d7a4f">tasks.acreonix.co.uk</a>
    </p>
    <p style="font-size:11px;color:#ccc;margin:6px 0 0">Sent to ${email}</p>
  </div>
</div>
</body></html>`,
  }
}
