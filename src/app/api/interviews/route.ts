import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { interviews } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// 获取所有访谈记录
export async function GET() {
  try {
    const allInterviews = await db.select().from(interviews)
    return NextResponse.json({ interviews: allInterviews })
  } catch (error) {
    console.error('Error fetching interviews:', error)
    return NextResponse.json(
      { error: '获取访谈记录失败' },
      { status: 500 }
    )
  }
}

// 创建新的访谈记录
export async function POST(request: Request) {
  try {
    const { title } = await request.json()
    
    const newInterview = {
      id: crypto.randomUUID(),
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'default' // TODO: 使用实际的用户ID
    }

    await db.insert(interviews).values(newInterview)

    return NextResponse.json({ interview: newInterview })
  } catch (error) {
    console.error('Error creating interview:', error)
    return NextResponse.json(
      { error: '创建访谈记录失败' },
      { status: 500 }
    )
  }
} 