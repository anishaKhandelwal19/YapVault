import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const MAX_CHAT_LENGTH = 50000;

export async function POST(request: Request) {
  try {
    const { chatText } = await request.json();

    if (!chatText || typeof chatText !== 'string' || chatText.trim().length === 0) {
      return NextResponse.json({ error: 'Chat text is required' }, { status: 400 });
    }

    if (chatText.length > MAX_CHAT_LENGTH) {
      return NextResponse.json(
        { error: `Chat text exceeds maximum length of ${MAX_CHAT_LENGTH} characters. Please trim your conversation.` },
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

    const prompt = `You are a technical revision card assistant. A user has pasted a conversation they had with an AI assistant (could be from ChatGPT, Claude, Gemini, or any other AI). The conversation is:

"""
${chatText.trim()}
"""

Your task:
1. Identify the CORE technical concept being discussed in this conversation.
2. Write a clear, concise definition of that concept.
3. Explain how it works in detail. Include a brief, clean code example or command block in markdown where appropriate.
4. List 3 key real-world use cases.
5. Formulate 2 typical placement interview questions and their concise, technical answers for this topic.
6. Detail 2 common mistakes or pitfalls students make when explaining this concept in interviews.
7. List 3 closely related technical concepts.
8. Write "ai_chat_summary": a clean, concise bullet-point summary (as a single string with bullet points using "• " prefix) of the KEY LEARNINGS from this conversation. Focus on what the user actually learned. Keep it to 4-6 bullet points.
9. Write "ai_chat_detail": This is the CURATED version of the conversation. Go through the entire chat and keep ONLY the parts that:
   - Explain the core concept clearly
   - Cover interview-relevant questions and answers
   - Contain important technical details, examples, or code
   
   REMOVE everything else: greetings, filler, off-topic tangents, meta-conversation ("thanks", "sure", "can you also..."), and any parts unrelated to the core technical concept.
   
   Format the curated chat as a clean Q&A style conversation using this format:
   "Q: [user's question or prompt, cleaned up]\nA: [AI's relevant answer, preserved but cleaned]"
   Separate each Q&A pair with a blank line. Preserve code blocks and technical details in the answers.

Ensure the response is fully complete and structured exactly as specified.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
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
            },
            ai_chat_summary: {
              type: 'STRING',
              description: 'Bullet-point summary of key learnings from the conversation. Each bullet starts with "• ".'
            },
            ai_chat_detail: {
              type: 'STRING',
              description: 'Curated Q&A version of the chat with only concept explanation and interview-relevant content preserved.'
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
