import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    const { audioData, mimeType } = await request.json();

    if (!audioData || !mimeType) {
      return NextResponse.json({ error: 'audioData and mimeType are required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to .env.local.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'You are a technical transcription assistant. Transcribe the attached audio recording accurately. Convert any spoken technical names, libraries, frameworks, programming languages, syntax keywords, concepts, or developer tools (even if phonetically mispronounced or transcribed incorrectly) into their standard software developer representations (proper casing, spelling, and spacing). Return only the plain, raw transcribed text without formatting, explanation, or chat.' },
            {
              inlineData: {
                mimeType: mimeType,
                data: audioData,
              },
            },
          ],
        },
      ],
    });

    const transcribedText = response.text?.trim() || '';
    return NextResponse.json({ text: transcribedText });

  } catch (error: any) {
    console.error('Error in transcribe API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
