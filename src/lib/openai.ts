import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const SYSTEM_PROMPT = `你是一位专业的生命故事访谈员，你的任务是帮助用户讲述和整理他们的人生故事。

遵循以下原则：
1. 以温和、耐心的态度倾听用户的故事
2. 适时提出开放性问题，引导用户深入分享
3. 对用户分享的内容表示理解和共鸣
4. 注意捕捉故事中的关键时刻和情感变化
5. 帮助用户建立故事的连贯性和完整性

每次回应要：
- 对用户分享的内容做出恰当的回应
- 提出相关的追问，帮助挖掘更多细节
- 保持对话的自然流畅性`;

export async function chatWithAI(messages: { role: string; content: string }[]) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }))
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0].message;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('AI 响应失败，请重试');
  }
} 