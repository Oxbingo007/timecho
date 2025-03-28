import OpenAI from 'openai';
import { AIModel, AIResponse } from './types';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const DEEPSEEK_API_KEY = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

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

async function chatWithOpenAI(messages: { role: string; content: string }[], modelName: string = 'gpt-4-turbo-preview'): Promise<AIResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: modelName,
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

    return {
      content: completion.choices[0].message.content || '抱歉，我现在无法回答。',
      model: 'openai'
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('OpenAI 响应失败，请重试');
  }
}

async function chatWithDeepseek(messages: { role: string; content: string }[]): Promise<AIResponse> {
  try {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('Deepseek API Key 未配置，请在环境变量中设置 NEXT_PUBLIC_DEEPSEEK_API_KEY');
    }

    console.log('Sending request to Deepseek API...');
    console.log('API URL:', DEEPSEEK_API_URL);
    console.log('Messages:', JSON.stringify(messages, null, 2));

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map(msg => ({
            role: msg.role as "user" | "assistant",
            content: msg.content
          }))
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    console.log('Deepseek API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepseek API Error Response:', errorText);
      throw new Error(`Deepseek API 错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Deepseek API Response Data:', JSON.stringify(data, null, 2));

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid response format from Deepseek:', data);
      throw new Error('Deepseek 返回了无效的响应格式');
    }

    return {
      content: data.choices[0].message.content,
      model: 'deepseek'
    };
  } catch (error) {
    console.error('Deepseek API error:', error);
    if (error instanceof Error) {
      throw new Error(`Deepseek 响应失败: ${error.message}`);
    }
    throw new Error('Deepseek 响应失败，请重试');
  }
}

async function chatWithQianwen(messages: { role: string; content: string }[]): Promise<AIResponse> {
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_QIANWEN_API_KEY}`,
        'Content-Type': 'application/json',
        'X-DashScope-Plugin': 'history',
      },
      body: JSON.stringify({
        model: 'qwen-max',
        input: {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map(msg => ({
              role: msg.role as "user" | "assistant",
              content: msg.content
            }))
          ]
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Qianwen API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.output.text || '抱歉，我现在无法回答。',
      model: 'qianwen'
    };
  } catch (error) {
    console.error('Qianwen API error:', error);
    throw new Error('通义千问响应失败，请重试');
  }
}

export async function chatWithAI(
  messages: { role: string; content: string }[],
  model: AIModel
): Promise<AIResponse> {
  switch (model) {
    case 'gpt3.5':
      return chatWithOpenAI(messages, 'gpt-3.5-turbo');
    case 'openai':
      return chatWithOpenAI(messages);
    case 'deepseek':
      return chatWithDeepseek(messages);
    case 'qianwen':
      return chatWithQianwen(messages);
    default:
      throw new Error('不支持的 AI 模型');
  }
} 