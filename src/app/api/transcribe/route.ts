// src/app/api/transcribe/route.ts
// Whisper transcription endpoint for Acreonix Tasks mobile app
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Send to OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'json',
    })

    return NextResponse.json({ text: transcription.text })
  } catch (error: any) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Transcription failed' },
      { status: 500 }
    )
  }
}

// Allow large audio files (up to 25MB — Whisper limit)
export const config = {
  api: {
    bodyParser: false,
  },
}
