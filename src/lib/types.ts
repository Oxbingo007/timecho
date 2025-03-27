export type AIModel = 'gpt3.5' | 'gpt4' | 'deepseek' | 'qianwen';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface AIResponse {
  content: string;
  model: AIModel;
} 