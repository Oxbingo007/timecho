import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { interviews, messages } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// 获取单个访谈记录
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const interview = await db
      .select()
      .from(interviews)
      .where(eq(interviews.id, params.id))
      .limit(1)

    if (!interview.length) {
      return NextResponse.json(
        { error: '未找到访谈记录' },
        { status: 404 }
      )
    }

    return NextResponse.json({ interview: interview[0] })
  } catch (error) {
    console.error('Error fetching interview:', error)
    return NextResponse.json(
      { error: '获取访谈记录失败' },
      { status: 500 }
    )
  }
}

// 更新访谈记录
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { title } = await request.json()
    
    await db
      .update(interviews)
      .set({
        title,
        updatedAt: new Date()
      })
      .where(eq(interviews.id, params.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating interview:', error)
    return NextResponse.json(
      { error: '更新访谈记录失败' },
      { status: 500 }
    )
  }
}

// 删除访谈记录
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db
      .delete(interviews)
      .where(eq(interviews.id, params.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting interview:', error)
    return NextResponse.json(
      { error: '删除访谈记录失败' },
      { status: 500 }
    )
  }
} 