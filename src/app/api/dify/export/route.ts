import { NextResponse } from 'next/server';
import * as docx from 'docx';
import { Paragraph, TextRun, Document, HeadingLevel } from 'docx';
import { Packer } from 'docx';

const DIFY_API_URL = 'https://api.dify.ai/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    if (!DIFY_API_KEY) {
      console.error('Dify API Key is not configured');
      return NextResponse.json(
        { error: 'Dify API Key 未配置' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      console.error('No conversation ID provided');
      return NextResponse.json(
        { error: '会话ID不能为空' },
        { status: 400 }
      );
    }

    console.log('Fetching conversation history for ID:', conversationId);

    // 获取对话历史
    const response = await fetch(
      `${DIFY_API_URL}/chat-messages?conversation_id=${conversationId}`,
      {
        headers: {
          'Authorization': `Bearer ${DIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Dify API error:', errorData);
      return NextResponse.json(
        { error: `获取对话历史失败: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Received messages:', data);
    
    const messages = data.messages || [];
    if (messages.length === 0) {
      return NextResponse.json(
        { error: '未找到对话内容' },
        { status: 404 }
      );
    }

    // 创建文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "访谈记录",
            heading: HeadingLevel.HEADING_1,
            spacing: {
              after: 200,
            },
          }),
          new Paragraph({
            text: `记录时间：${new Date().toLocaleString('zh-CN')}`,
            spacing: {
              after: 400,
            },
          }),
          ...messages.map((message: any) => {
            const role = message.role === 'assistant' ? '访谈大师' : '访谈对象';
            const content = message.message || message.content || '';
            return new Paragraph({
              children: [
                new TextRun({
                  text: `${role}：`,
                  bold: true,
                }),
                new TextRun({
                  text: content,
                  break: 1,
                }),
              ],
              spacing: {
                after: 200,
              },
            });
          }),
        ],
      }],
    });

    // 生成文档
    const buffer = await Packer.toBuffer(doc);
    
    // 返回文档
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="访谈记录_${new Date().toISOString().split('T')[0]}.docx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导出失败' },
      { status: 500 }
    );
  }
} 