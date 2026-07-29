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

    const prompt = `You are an expert technical learning assistant. ${audioData
      ? "A user has just explained a concept in the attached audio recording."
      : `A user has just provided the following content: "${transcript}".`
      }
    
    The user wants to achieve this specific learning goal:
    **${goal || 'Create Revision Notes'}**
    
    Additional custom instructions from the user:
    **${customInstruction || 'None'}**
    
    Generate output according to these rules, adapting your tone and focus perfectly to match the user's goal and instructions:
    1. Format your text using Markdown. Use **bold** heavily for key terms, use bullet points instead of long paragraphs, and keep explanations concise (not too large, not too small, best fit for revision).
    2. NEVER output HTML tags (such as <ul>, <li>, <ol>, <p>, <br>). ONLY use standard Markdown syntax (such as -, *, 1., 2.).
    3. Ensure every list item, bullet point, or numbered step starts on its own line (separated by double newlines \n\n or single newlines \n). Do not smash numbered points together into a single line or paragraph.
    4. If the goal is "Explain Like Teacher", use analogies and simple language.
    5. If the goal is "Concept Grouping", group related concepts clearly.
    6. If the goal is "Flashcard Mode" or "Exam Questions", focus heavily on the 'interview_questions' output.
    7. Fill out the structured fields below to build a comprehensive Revision Card.
    
    Your task:
    1. "title": Identify the core technical concept being discussed. ${audioData
        ? "Listen to the audio, transcribe it, and correct any phonetic transcription errors or mispronunciations by converting them into standard software developer terminology."
        : "Correct any spelling or phrasing errors."
      }
    2. "definition": Write a clear, concise definition with bold terms.
    3. "how_it_works": Explain the mechanics, grouped concepts, or detailed notes in detail. Use Markdown bullet points or numbered lists.
    4. "use_cases": List 3 real-world use cases.
    5. "interview_questions": Formulate Q&A pairs, flashcards, or exam questions based on the goal. Usually generate 3-6 pairs. However, if the user explicitly requests more in the custom instructions (e.g., "give 30 questions" or "create 15 flashcards"), generate exactly that many questions .
    6. "how_to_explain": Write a comprehensive, step-by-step guide explaining how a candidate should present and explain this concept to an interviewer in a technical coding interview to impress them and stand out.
    7. "related_concepts": List 3 closely related technical concepts.
    8. "mental_model": Formulate a simple, visual analogy or mental model (e.g. "Imagine a road: Free road = cost 0, Toll road = cost 1...").
    9. "remember_this": Write a short, highly memorable formula or note (e.g., "0-1 BFS = Dijkstra + deque").
    10. "key_trick": Write a short sentence highlighting the core trick or insight that eliminates extra state/complexity (e.g., "No extra 'changed' state needed because shortest path guarantees we only keep optimal states.").
    
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
            how_to_explain: {
              type: 'STRING',
              description: 'Step-by-step guide on how a candidate should explain this concept in a technical interview.'
            },
            related_concepts: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Related technical topics.'
            },
            mental_model: { type: 'STRING', description: 'A short visual analogy or mental model.' },
            remember_this: { type: 'STRING', description: 'A short, highly memorable formula or note.' },
            key_trick: { type: 'STRING', description: 'A short sentence highlighting the core trick or insight.' },
            complexity_time: { type: 'STRING', description: 'Time complexity, e.g. O(V+E)' },
            complexity_space: { type: 'STRING', description: 'Space complexity, e.g. O(V)' },
            tags: { type: 'ARRAY', items: { type: 'STRING' }, description: '2-4 category tags.' },
            difficulty: { type: 'STRING', description: 'Difficulty level: Easy, Medium, or Hard.' }
          },
          required: [
            'title',
            'definition',
            'how_it_works',
            'use_cases',
            'interview_questions',
            'how_to_explain',
            'related_concepts',
            'mental_model',
            'remember_this',
            'key_trick',
            'complexity_time',
            'complexity_space',
            'tags',
            'difficulty'
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
