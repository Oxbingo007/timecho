import { NextResponse } from 'next/server';

const DIFY_API_URL = 'https://api.dify.ai/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, conversation_id } = body;

    const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        conversation_id,
        response_mode: 'streaming',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to communicate with Dify API');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Dify API route:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${DIFY_API_URL}/messages?conversation_id=${conversationId}`,
      {
        headers: {
          'Authorization': `Bearer ${DIFY_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch messages from Dify API');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Dify API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
} 