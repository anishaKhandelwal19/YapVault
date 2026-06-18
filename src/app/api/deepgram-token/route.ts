import { NextResponse } from 'next/server';

export async function POST() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Deepgram API key is not configured. Please add DEEPGRAM_API_KEY to .env.local.' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ttl_seconds: 60, // 60-second window to establish connection
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Deepgram authentication error:', errText);
      return NextResponse.json({ error: `Deepgram API error: ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error generating Deepgram token:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
