// lib/email.ts — Resend integration for Acreonix Tasks
// Install: npm install resend

type SendEmailOptions = {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send')
    return { success: false, error: 'Email not configured' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Acreonix Tasks <noreply@acreonix.co.uk>',
        to,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[email] Resend error:', err)
      return { success: false, error: (err as any).message ?? 'Send failed' }
    }

    return { success: true }
  } catch (e: any) {
    console.error('[email] Network error:', e)
    return { success: false, error: e.message }
  }
}

// ── Email templates ──────────────────────────────────────────────────────────

const BASE_STYLE = `
  font-family: 'DM Sans', -apple-system, sans-serif;
  background: #f8faf9;
  margin: 0;
  padding: 0;
`

const CARD_STYLE = `
  max-width: 520px;
  margin: 40px auto;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
`

const HEADER_STYLE = `
  background: #2d7a4f;
  padding: 28px 32px;
  text-align: center;
`

const BODY_STYLE = `
  padding: 32px;
`

const FOOTER_STYLE = `
  padding: 20px 32px;
  border-top: 1px solid #f0f0ee;
  text-align: center;
  color: #aaa;
  font-size: 12px;
`

const BTN_STYLE = `
  display: inline-block;
  background: #2d7a4f;
  color: #fff !important;
  text-decoration: none;
  padding: 13px 28px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  margin: 20px 0;
`

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Acreonix Tasks</title></head>
<body style="${BASE_STYLE}">
<div style="${CARD_STYLE}">
  <div style="${HEADER_STYLE}">
    <img src="https://tasks.acreonix.co.uk/logo.png" width="32" height="32" alt="Acreonix" style="display:inline-block;vertical-align:middle;margin-right:10px;border-radius:6px">
    <span style="color:#fff;font-size:18px;font-weight:700;vertical-align:middle;letter-spacing:0.08em;font-family:Georgia,serif">ACREONIX</span>
    <span style="color:#c9a84c;font-size:11px;font-weight:600;vertical-align:middle;margin-left:6px;letter-spacing:0.15em;font-family:Georgia,serif">TASKS</span>
  </div>
  <div style="${BODY_STYLE}">
    ${content}
  </div>
  <div style="${FOOTER_STYLE}">
    <p>Acreonix Tasks · <a href="https://tasks.acreonix.co.uk" style="color:#2d7a4f">tasks.acreonix.co.uk</a></p>
    <p style="margin-top:4px">If you didn't expect this email, you can safely ignore it.</p>
  </div>
</div>
</body></html>`
}

export function teamInviteEmail({
  inviterName,
  teamName,
  inviteUrl,
  recipientEmail,
}: {
  inviterName: string
  teamName: string
  inviteUrl: string
  recipientEmail: string
}): { subject: string; html: string } {
  return {
    subject: `${inviterName} invited you to join ${teamName} on Acreonix Tasks`,
    html: baseTemplate(`
      <h2 style="font-size:22px;color:#1a1a1a;margin:0 0 8px;font-weight:600">You're invited to a team</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        <strong style="color:#1a1a1a">${inviterName}</strong> has invited you to join 
        <strong style="color:#2d7a4f">${teamName}</strong> on Acreonix Tasks — 
        an AI-powered task and scheduling platform.
      </p>
      <div style="background:#f0faf4;border-radius:10px;padding:16px 20px;margin:0 0 24px">
        <p style="margin:0;font-size:13px;color:#1f5537">
          💡 Acreonix Tasks uses AI to help teams capture tasks, prioritise daily work, and plan their schedule — without the rigidity of traditional scheduling tools.
        </p>
      </div>
      <div style="text-align:center">
        <a href="${inviteUrl}" style="${BTN_STYLE}">Accept invitation</a>
        <p style="color:#aaa;font-size:12px;margin:8px 0 0">This link expires in 7 days</p>
      </div>
      <hr style="border:none;border-top:1px solid #f0f0ee;margin:28px 0">
      <p style="color:#aaa;font-size:12px;text-align:center">
        Invite sent to <strong>${recipientEmail}</strong>
      </p>
    `),
  }
}

export function proShareInviteEmail({
  inviterName,
  projectName,
  inviteUrl,
  recipientEmail,
}: {
  inviterName: string
  projectName: string
  inviteUrl: string
  recipientEmail: string
}): { subject: string; html: string } {
  return {
    subject: `${inviterName} shared "${projectName}" with you on Acreonix Tasks`,
    html: baseTemplate(`
      <h2 style="font-size:22px;color:#1a1a1a;margin:0 0 8px;font-weight:600">A project has been shared with you</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        <strong style="color:#1a1a1a">${inviterName}</strong> has shared the project 
        <strong style="color:#7c3aed">${projectName}</strong> with you on Acreonix Tasks.
      </p>
      <div style="background:#f5f3ff;border-radius:10px;padding:16px 20px;margin:0 0 24px;border-left:3px solid #7c3aed">
        <p style="margin:0;font-size:13px;color:#4c1d95">
          You'll be able to view and collaborate on tasks in this project once you accept.
        </p>
      </div>
      <div style="text-align:center">
        <a href="${inviteUrl}" style="${BTN_STYLE.replace('#2d7a4f', '#7c3aed')}">View shared project</a>
        <p style="color:#aaa;font-size:12px;margin:8px 0 0">This link expires in 7 days</p>
      </div>
      <hr style="border:none;border-top:1px solid #f0f0ee;margin:28px 0">
      <p style="color:#aaa;font-size:12px;text-align:center">
        Invite sent to <strong>${recipientEmail}</strong>
      </p>
    `),
  }
}
