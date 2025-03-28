import { NextResponse } from 'next/server';
import { chatWithAI } from '@/lib/ai-services';
import { Message, AIModel } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { messages, model = 'gpt3.5' } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: '无效的消息格式' },
        { status: 400 }
      );
    }

    const response = await chatWithAI(messages, model as AIModel);
    
    return NextResponse.json({
      message: response.content,
      model: response.model
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '发送消息失败' },
      { status: 500 }
    );
  }
} 