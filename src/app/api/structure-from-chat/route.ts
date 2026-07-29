import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const MAX_CHAT_LENGTH = 50000;

export async function POST(request: Request) {
  try {
    const { chatText, goal, customInstruction } = await request.json();

    if (!chatText || typeof chatText !== 'string' || chatText.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (chatText.length > MAX_CHAT_LENGTH) {
      return NextResponse.json(
        { error: `Content exceeds maximum length of ${MAX_CHAT_LENGTH} characters. Please trim your text.` },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to .env.local.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert technical learning assistant.

Analyze the following content:
"""
${chatText.trim()}
"""

The user wants to achieve this specific learning goal:
**${goal || 'Create Revision Notes'}**

Additional custom instructions from the user:
**${customInstruction || 'None'}**

Generate output according to these rules, adapting your tone and focus to perfectly match the user's goal and instructions:
1. Format your text using Markdown. Use **bold** heavily for key terms, use bullet points instead of long paragraphs, and keep explanations concise (not too large, not too small, best fit for revision).
2. If the goal is "Explain Like Teacher", use analogies and simple language.
3. If the goal is "Concept Grouping", group related concepts clearly.
4. If the goal is "Flashcard Mode" or "Exam Questions", focus heavily on the 'interview_questions' output.
5. Fill out the structured fields below to build a comprehensive Revision Card.

Your task is to extract/generate:
1. "title": Identify the core topic.
2. "definition": Write a clear, concise definition (1-2 sentences). Use **bold** for key terms.
3. "how_it_works": Explain the mechanics, grouped concepts, or detailed notes in detail. Use Markdown bullet points or numbered lists. DO NOT write massive paragraphs.
4. "use_cases": List 3 real-world use cases.
5. "interview_questions": Formulate 2-4 Q&A pairs (or flashcards/exam questions) based on the goal.
6. "common_mistakes": List 2 pitfalls or confusions.
7. "related_concepts": List 3 related topics.
8. "ai_chat_summary": Write a concise bullet-point summary (using "• " prefix) of the most important takeaways or facts to memorize.
9. "ai_chat_detail": If the input was a chat, clean it into Q&A. If it was notes, provide an "Important Points Extraction" or "Mind Map" representation here in clean Markdown.

Ensure the response is fully complete, highly readable for a student, and structured exactly as specified.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
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
            },
            ai_chat_summary: {
              type: 'STRING',
              description: 'Bullet-point summary of key takeaways/memorization points. Each bullet starts with "• ".'
            },
            ai_chat_detail: {
              type: 'STRING',
              description: 'Curated Q&A, important extraction, or markdown mind-map representation.'
            }
          },
          required: [
            'title',
            'definition',
            'how_it_works',
            'use_cases',
            'interview_questions',
            'common_mistakes',
            'related_concepts',
            'ai_chat_summary',
            'ai_chat_detail'
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
    console.error('Error in structure-from-chat API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

