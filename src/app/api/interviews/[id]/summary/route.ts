import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { messages, summaries } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

// 生成访谈纪要
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { messageIds } = await request.json()

    // 获取选中的消息
    const selectedMessages = await db
      .select()
      .from(messages)
      .where(inArray(messages.id, messageIds))
      .orderBy(messages.createdAt)

    if (selectedMessages.length === 0) {
      return NextResponse.json(
        { error: '未找到选中的消息' },
        { status: 404 }
      )
    }

    // 创建文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "访谈纪要",
            heading: HeadingLevel.HEADING_1,
            spacing: {
              after: 200,
            },
          }),
          new Paragraph({
            text: `生成时间：${new Date().toLocaleString('zh-CN')}`,
            spacing: {
              after: 400,
            },
          }),
          ...selectedMessages.map(message => {
            const role = message.role === 'assistant' ? '访谈官' : '受访者'
            return new Paragraph({
              children: [
                new TextRun({
                  text: `${role}：`,
                  bold: true,
                }),
                new TextRun({
                  text: message.content,
                  break: 1,
                }),
              ],
              spacing: {
                after: 200,
              },
            })
          }),
        ],
      }],
    })

    // 生成文档
    const buffer = await Packer.toBuffer(doc)

    // 保存纪要
    const summary = {
      id: crypto.randomUUID(),
      interviewId: params.id,
      content: selectedMessages.map(m => `${m.role === 'assistant' ? '访谈官' : '受访者'}：${m.content}`).join('\n'),
      createdAt: new Date()
    }

    await db.insert(summaries).values(summary)
    
    // 返回文档
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="访谈纪要_${new Date().toLocaleDateString('zh-CN')}.docx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: '生成纪要失败' },
      { status: 500 }
    )
  }
} 