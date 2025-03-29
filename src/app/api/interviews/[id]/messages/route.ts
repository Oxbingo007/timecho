import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { messages } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// 获取访谈消息
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const interviewMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.interviewId, params.id))
      .orderBy(messages.createdAt)

    return NextResponse.json({ messages: interviewMessages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: '获取访谈消息失败' },
      { status: 500 }
    )
  }
}

// 添加新消息
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const message = await request.json()
    
    const newMessage = {
      id: crypto.randomUUID(),
      interviewId: params.id,
      role: message.role,
      content: message.content,
      createdAt: new Date(),
      isSelected: false
    }

    await db.insert(messages).values(newMessage)

    return NextResponse.json({ message: newMessage })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: '创建消息失败' },
      { status: 500 }
    )
  }
}

// 更新消息选择状态
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { messageId, isSelected } = await request.json()
    
    await db
      .update(messages)
      .set({ isSelected })
      .where(eq(messages.id, messageId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json(
      { error: '更新消息失败' },
      { status: 500 }
    )
  }
} 