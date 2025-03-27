import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { chatWithAI } from '@/lib/ai-services';
import { AIModel } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `你是一位专业的传记作家，擅长将口述访谈内容转化为优美的传记文章。
在写作时，请遵循以下原则：

1. 结构规范：
   - 采用章节式结构
   - 每个章节聚焦人生的不同阶段或主题
   - 适当使用时间线索串联故事

2. 写作风格：
   - 采用第三人称叙述
   - 结合场景描写和细节刻画
   - 运用优美而不失真实的语言
   - 注重情感表达和心理描写

3. 内容处理：
   - 提炼访谈中的关键事件和转折点
   - 挖掘事件背后的思考和感悟
   - 展现人物性格特征和价值观
   - 注重历史背景和时代特征

4. 写作技巧：
   - 开篇要吸引人
   - 善用对话和细节增强真实感
   - 通过具体事例展现人物特点
   - 结尾要有升华和思考

请基于提供的访谈内容，创作一篇结构完整、感人至深的传记文章。`;

export async function POST(request: Request) {
  try {
    const { messages, model = 'gpt3.5', style, stylePrompt } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: '无效的访谈内容' },
        { status: 400 }
      );
    }

    // 将访谈内容整理成有序的对话记录
    const conversationText = messages
      .map(msg => `${msg.role === 'assistant' ? '访谈官' : '受访者'}：${msg.content}`)
      .join('\n\n');

    // 组合提示词
    const finalPrompt = `${SYSTEM_PROMPT}\n\n${stylePrompt ? `特别要求：${stylePrompt}\n\n` : ''}以下是一段生命故事访谈的内容，请基于这些内容创作一篇传记文章：\n\n${conversationText}`;

    // 使用统一的 AI 服务接口
    const aiResponse = await chatWithAI(
      [{ role: 'user', content: finalPrompt }],
      model as AIModel
    );

    return NextResponse.json({ biography: aiResponse.content });

  } catch (error) {
    console.error('Biography generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成传记失败' },
      { status: 500 }
    );
  }
} 