import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    const { transcript, audioData, mimeType, goal, customInstruction } = await request.json();

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

    const prompt = `You are an expert technical learning assistant. ${
      audioData 
        ? "A user has just explained a concept in the attached audio recording." 
        : `A user has just provided the following content: "${transcript}".`
    }
    
    The user wants to achieve this specific learning goal:
    **${goal || 'Create Revision Notes'}**
    
    Additional custom instructions from the user:
    **${customInstruction || 'None'}**
    
    Generate output according to these rules, adapting your tone and focus perfectly to match the user's goal and instructions:
    1. Format your text using Markdown. Use **bold** heavily for key terms, use bullet points instead of long paragraphs, and keep explanations concise (not too large, not too small, best fit for revision).
    2. If the goal is "Explain Like Teacher", use analogies and simple language.
    3. If the goal is "Concept Grouping", group related concepts clearly.
    4. If the goal is "Flashcard Mode" or "Exam Questions", focus heavily on the 'interview_questions' output.
    5. Fill out the structured fields below to build a comprehensive Revision Card.
    
    Your task:
    1. "title": Identify the core technical concept being discussed. ${
      audioData 
        ? "Listen to the audio, transcribe it, and correct any phonetic transcription errors or mispronunciations by converting them into standard software developer terminology." 
        : "Correct any spelling or phrasing errors."
    }
    2. "definition": Write a clear, concise definition with bold terms.
    3. "how_it_works": Explain the mechanics, grouped concepts, or detailed notes in detail. Use Markdown bullet points or numbered lists.
    4. "use_cases": List 3 real-world use cases.
    5. "interview_questions": Formulate 2-4 Q&A pairs, flashcards, or exam questions based on the goal.
    6. "common_mistakes": List 2 pitfalls or confusions students make.
    7. "related_concepts": List 3 closely related technical concepts.
    
    Ensure the response is fully complete, highly readable for a student, and structured exactly as specified.`;

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
            definition: { type: 'STRING', description: 'A clear concise definition with bold terms.' },
            how_it_works: { type: 'STRING', description: 'Detailed mechanics or grouped concepts using markdown lists.' },
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
              description: 'Flashcards or exam questions based on the content.'
            },
            common_mistakes: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Mistakes or confusions to avoid.'
            },
            related_concepts: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Related technical topics.'
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
