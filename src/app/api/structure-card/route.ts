import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    const { transcript, audioData, mimeType } = await request.json();

    if (!transcript && !audioData) {
      return NextResponse.json({ error: 'Either transcript or audioData is required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to .env.local.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a technical revision card assistant. ${
      audioData 
        ? "A user has just explained a concept in the attached audio recording." 
        : `A user has just explained a concept. The explanation is: "${transcript}".`
    }
    
    Your task:
    1. Identify the core technical concept being discussed. ${
      audioData 
        ? "Listen to the audio, transcribe it, and correct any phonetic transcription errors or mispronunciations by converting them into standard software developer terminology (proper casing, spelling, and spacing)." 
        : "Correct any spelling or phrasing errors."
    }
    2. Write a clear, concise definition.
    3. Explain how it works in detail. Include a brief, clean code example or command block in markdown where appropriate.
    4. List 3 key real-world use cases.
    5. Formulate 2 typical placement interview questions and their concise, technical answers for this topic.
    6. Detail 2 common mistakes or pitfalls students make when explaining this concept in interviews.
    7. List 3 closely related technical concepts.
    
    Ensure the response is fully complete and structured exactly as specified.`;

    let contents: any;
    if (audioData && mimeType) {
      contents = [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: audioData,
              },
            },
          ],
        },
      ];
    } else {
      contents = prompt;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'The formal, capitalized name of the concept.' },
            definition: { type: 'STRING', description: 'A clear 2-3 sentence definition.' },
            how_it_works: { type: 'STRING', description: 'Detailed mechanics of how it works under the hood. Include clear formatting or code snippets in markdown if useful.' },
            use_cases: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'List of real-world use cases.'
            },
            interview_questions: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  question: { type: 'STRING' },
                  answer: { type: 'STRING' }
                },
                required: ['question', 'answer']
              },
              description: 'Common technical interview questions and their answers.'
            },
            common_mistakes: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Mistakes to avoid in interviews.'
            },
            related_concepts: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Prerequisites or related technical topics.'
            }
          },
          required: [
            'title',
            'definition',
            'how_it_works',
            'use_cases',
            'interview_questions',
            'common_mistakes',
            'related_concepts'
          ]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      return NextResponse.json({ error: 'Failed to generate content from Gemini.' }, { status: 500 });
    }

    const structuredData = JSON.parse(resultText);
    return NextResponse.json(structuredData);

  } catch (error: any) {
    console.error('Error in structure-card API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
