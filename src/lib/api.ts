import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;
const API_BASE_URL = 'https://api.deepseek.com/v1';

interface StoryProcessingResponse {
  enhancedStory: string;
  structure: {
    title: string;
    summary: string;
    chapters: Array<{
      title: string;
      content: string;
    }>;
  };
}

export async function processStory(content: string): Promise<StoryProcessingResponse> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的中文故事编辑，擅长优化和结构化生命故事。
            请以结构化的 JSON 格式返回以下内容：
            {
              "title": "故事标题",
              "summary": "故事摘要（200字以内）",
              "enhancedStory": "优化后的完整故事",
              "chapters": [
                {
                  "title": "章节标题",
                  "content": "章节内容"
                }
              ]
            }
            
            在处理故事时，请注意：
            1. 保持原有故事的真实性和情感
            2. 优化语言表达，使其更生动流畅
            3. 根据内容自然分章节，每个章节都要有明确的主题
            4. 添加适当的细节描写和场景还原
            5. 确保整体结构清晰，脉络连贯`
          },
          {
            role: 'user',
            content
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data.choices[0].message.content;
    
    try {
      // 尝试解析返回的 JSON 字符串
      const parsedResult = JSON.parse(result);
      return {
        enhancedStory: parsedResult.enhancedStory,
        structure: {
          title: parsedResult.title,
          summary: parsedResult.summary,
          chapters: parsedResult.chapters
        }
      };
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // 如果解析失败，返回原始文本
      return {
        enhancedStory: result,
        structure: {
          title: "生命故事",
          summary: "故事概要",
          chapters: [{
            title: "完整故事",
            content: result
          }]
        }
      };
    }
  } catch (error) {
    console.error('Error processing story:', error);
    throw new Error('故事处理失败，请稍后重试');
  }
} 