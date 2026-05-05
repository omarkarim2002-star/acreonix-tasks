import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Minimal iCal parser — no external dependencies
function parseICal(ical: string): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const lines = ical.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n').split('\n')

  let current: Partial<CalendarEvent> | null = null

  for (const raw of lines) {
    const line = raw.trim()

    if (line === 'BEGIN:VEVENT') {
      current = {}
      continue
    }

    if (line === 'END:VEVENT' && current) {
      if (current.title && current.start && current.end) {
        events.push(current as CalendarEvent)
      }
      current = null
      continue
    }

    if (!current) continue

    // Parse DTSTART
    if (line.startsWith('DTSTART')) {
      current.start = parseDTValue(line)
      current.allDay = line.includes('DATE:') && !line.includes('DATE-TIME')
    }

    // Parse DTEND / DURATION
    if (line.startsWith('DTEND')) {
      current.end = parseDTValue(line)
    }

    if (line.startsWith('DURATION:') && current.start) {
      current.end = addDuration(current.start, line.split(':')[1])
    }

    // Parse SUMMARY
    if (line.startsWith('SUMMARY:')) {
      current.title = decodeICal(line.slice(8))
    }

    // Parse DESCRIPTION
    if (line.startsWith('DESCRIPTION:')) {
      current.description = decodeICal(line.slice(12))
    }

    // Parse LOCATION
    if (line.startsWith('LOCATION:')) {
      current.location = decodeICal(line.slice(9))
    }

    // Parse UID for deduplication
    if (line.startsWith('UID:')) {
      current.uid = line.slice(4).trim()
    }

    // Parse RRULE (recurring — skip for now, too complex)
    if (line.startsWith('RRULE:')) {
      current.recurring = true
    }
  }

  return events
}

function parseDTValue(line: string): string {
  const value = line.split(':').slice(1).join(':').trim()
  const tzidMatch = line.match(/TZID=([^:]+):/)
  // VALUE=DATE (all-day)
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00Z`
  }
  // UTC datetime
  if (value.endsWith('Z')) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`
  }
  // Local datetime — treat as UTC
  if (value.length >= 15) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`
  }
  return new Date().toISOString()
}

function addDuration(start: string, duration: string): string {
  // Parse P1DT2H3M style durations
  const d = new Date(start)
  const match = duration.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/)
  if (match) {
    if (match[1]) d.setDate(d.getDate() + parseInt(match[1]))
    if (match[2]) d.setHours(d.getHours() + parseInt(match[2]))
    if (match[3]) d.setMinutes(d.getMinutes() + parseInt(match[3]))
  }
  return d.toISOString()
}

function decodeICal(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}

type CalendarEvent = {
  title: string
  start: string
  end: string
  description?: string
  location?: string
  uid?: string
  allDay?: boolean
  recurring?: boolean
}

// Fetch iCal from URL (for Google Calendar / Outlook public feeds)
async function fetchICal(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AcreonixTasks/1.0' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Failed to fetch calendar: ${res.status}`)
  return res.text()
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const url = formData.get('url') as string | null
  const daysAhead = parseInt((formData.get('daysAhead') as string) ?? '14')

  let icalText = ''

  if (file) {
    icalText = await file.text()
  } else if (url) {
    try {
      icalText = await fetchICal(url)
    } catch (e: any) {
      return NextResponse.json({ error: e.message ?? 'Failed to fetch calendar URL' }, { status: 400 })
    }
  } else {
    return NextResponse.json({ error: 'Provide a file or URL' }, { status: 400 })
  }

  if (!icalText.includes('BEGIN:VCALENDAR')) {
    return NextResponse.json({ error: 'Invalid iCal file — must contain BEGIN:VCALENDAR' }, { status: 400 })
  }

  const allEvents = parseICal(icalText)

  // Filter to events within the import window
  const now = new Date()
  const cutoff = new Date(now.getTime() + daysAhead * 86400000)
  const yesterday = new Date(now.getTime() - 86400000)

  const relevant = allEvents.filter(e => {
    const start = new Date(e.start)
    return start >= yesterday && start <= cutoff && !e.recurring
  })

  if (relevant.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped: allEvents.length,
      message: `No events found in the next ${daysAhead} days. ${allEvents.length} total events in file.`,
    })
  }

  // Dedup by uid — don't import events already in DB
  const existingUids = new Set<string>()
  if (relevant.some(e => e.uid)) {
    const uids = relevant.filter(e => e.uid).map(e => e.uid!)
    const { data: existing } = await supabaseAdmin
      .from('calendar_events')
      .select('external_uid')
      .eq('user_id', userId)
      .in('external_uid', uids)
    existing?.forEach((e: any) => existingUids.add(e.external_uid))
  }

  const toImport = relevant.filter(e => !e.uid || !existingUids.has(e.uid))

  // Batch insert
  const rows = toImport.map(e => ({
    user_id: userId,
    title: e.title,
    description: e.description ?? null,
    start_time: e.start,
    end_time: e.end,
    colour: '#6366f1', // indigo for imported events
    type: 'imported',
    confirmed: true, // imported events are confirmed (they're real)
    all_day: e.allDay ?? false,
    external_uid: e.uid ?? null,
  }))

  const { error } = await supabaseAdmin
    .from('calendar_events')
    .insert(rows)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return summary for AI context
  const summary = toImport.slice(0, 20).map(e => ({
    title: e.title,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
  }))

  return NextResponse.json({
    imported: toImport.length,
    skipped: relevant.length - toImport.length + (allEvents.length - relevant.length),
    total: allEvents.length,
    daysAhead,
    summary,
    message: `Imported ${toImport.length} event${toImport.length !== 1 ? 's' : ''} from your calendar. AI scheduling will now work around these.`,
  })
}

// GET — return imported event count
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { count } = await supabaseAdmin
    .from('calendar_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'imported')

  return NextResponse.json({ count: count ?? 0 })
}
