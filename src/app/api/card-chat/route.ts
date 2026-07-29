import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function POST(request: Request) {
  try {
    const { card, messages, userMessage } = await request.json();

    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (!card || !card.title) {
      return NextResponse.json({ error: 'Card context is required' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build system instruction with full card context
    const systemInstruction = `You are an expert technical learning coach helping a developer deeply understand: **${card.title}**.

Here is what the developer already has on their revision card:
---
**Definition:** ${card.definition || 'N/A'}

**How It Works / Details:** ${card.how_it_works || 'N/A'}

**Use Cases:** ${(card.use_cases || []).join(', ') || 'N/A'}

**Mental Model:** ${card.mental_model || 'N/A'}

**Key Trick:** ${card.key_trick || 'N/A'}

**Remember This:** ${card.remember_this || 'N/A'}

**Difficulty:** ${card.difficulty || 'N/A'}
---

Your role:
- You are NOT limited to only what is written on the card above. Use your full knowledge base.
- Feel free to discuss subtopics, code examples (in any language), edge cases, trade-offs, alternatives, or adjacent concepts.
- Always use **Markdown** for formatting. Use bold for key terms, bullet points for lists, and code blocks (\`\`\`) for code.
- Keep answers concise but comprehensive. Prioritize interview-readiness and practical understanding.
- NEVER output HTML tags like <ul>, <li>, <p>. Only standard Markdown.`;

    // Build conversation history for Gemini multi-turn chat
    const history = (messages as ChatMessage[]).map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction },
      history,
    });

    const response = await chat.sendMessage({ message: userMessage });
    const reply = response.text;

    if (!reply) {
      return NextResponse.json({ error: 'No response generated.' }, { status: 500 });
    }

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error('Error in card-chat API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
