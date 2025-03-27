import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, convertInchesToTwip, AlignmentType, HeadingLevel } from 'docx';
import { Message } from '@/lib/types';

export async function POST(request: Request) {
  try {
    console.log('Starting export process...');
    
    // Parse request body
    const body = await request.json();
    console.log('Received messages:', body);
    
    if (!body.messages || !Array.isArray(body.messages)) {
      console.error('Invalid messages format:', body);
      return NextResponse.json(
        { error: '无效的消息格式' },
        { status: 400 }
      );
    }

    const { messages } = body as { messages: Message[] };

    if (messages.length === 0) {
      return NextResponse.json(
        { error: '没有可导出的内容' },
        { status: 400 }
      );
    }

    console.log('Creating document with messages:', messages.length);

    // Create document with specific settings for Chinese text
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Microsoft YaHei",
              size: 24,
            },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          // 标题
          new Paragraph({
            text: "生命故事访谈记录",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 240,
              after: 480,
            },
            run: {
              size: 36,
              bold: true,
            }
          }),
          
          // 时间
          new Paragraph({
            children: [
              new TextRun({
                text: "记录时间：",
                size: 24,
                bold: true
              }),
              new TextRun({
                text: new Date().toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }),
                size: 24
              })
            ],
            spacing: {
              before: 240,
              after: 480,
              line: 360
            }
          }),

          // 对话内容
          ...messages.map((message, index) => {
            console.log(`Processing message ${index + 1}/${messages.length}`);
            return new Paragraph({
              children: [
                new TextRun({
                  text: `${message.role === 'assistant' ? '访谈官' : '受访者'}：`,
                  bold: true,
                  size: 24
                }),
                new TextRun({
                  text: message.content,
                  size: 24
                })
              ],
              spacing: {
                before: 240,
                after: 240,
                line: 360,
                lineRule: 'auto'
              },
              indent: {
                firstLine: convertInchesToTwip(0.5)
              }
            });
          })
        ]
      }]
    });

    console.log('Document created, generating buffer...');

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    console.log('Buffer generated, sending response...');

    // Return the document
    const response = new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`访谈记录_${new Date().toLocaleDateString('zh-CN')}.docx`)}`,
        'Cache-Control': 'no-cache'
      }
    });

    console.log('Export completed successfully');
    return response;

  } catch (error) {
    console.error('Export error details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导出失败' },
      { status: 500 }
    );
  }
} 