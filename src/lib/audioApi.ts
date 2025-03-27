import axios from 'axios';

const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
const API_BASE_URL = 'https://api.elevenlabs.io/v1';

// 预设的声音列表 - 使用 ElevenLabs 实际的声音 ID
export const VOICE_OPTIONS = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: '专业男声', stability: 0.5, similarity: 0.8 }, // Adam
  { id: 'EXAVITQu4vr4xnSDxMaL', name: '温柔女声', stability: 0.5, similarity: 0.8 }, // Rachel
  { id: 'AZnzlk1XvdvUeBnXmlld', name: '成熟女声', stability: 0.5, similarity: 0.8 }, // Domi
  { id: 'pNInz6obpgDQGcFmaJgB', name: '年轻男声', stability: 0.5, similarity: 0.8 }, // Sam
];

interface GenerateAudioOptions {
  text: string;
  voiceId: string;
  stability?: number;
  similarityBoost?: number;
}

interface GenerateAudioResponse {
  audioUrl: string;
}

interface CloneVoiceResponse {
  voiceId: string;
}

// 克隆声音
export async function cloneVoice(name: string, files: File[]): Promise<CloneVoiceResponse> {
  try {
    const formData = new FormData();
    formData.append('name', name);
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await axios.post(
      `${API_BASE_URL}/voices/add`,
      formData,
      {
        headers: {
          'xi-api-key': `${ELEVENLABS_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.data.voice_id) {
      throw new Error('声音克隆失败：服务器未返回有效的声音ID');
    }

    return {
      voiceId: response.data.voice_id
    };
  } catch (error) {
    console.error('Error cloning voice:', error);
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data;
      let errorMessage = '声音克隆失败';
      
      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData?.detail) {
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((err: any) => err.msg || err.message).join(', ');
        } else if (typeof errorData.detail === 'object') {
          errorMessage = Object.values(errorData.detail).join(', ');
        }
      }
      
      throw new Error(errorMessage);
    }
    throw new Error('声音克隆失败，请检查网络连接并稍后重试');
  }
}

// 获取用户的声音列表
export async function getUserVoices(): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/voices`,
      {
        headers: {
          'xi-api-key': `${ELEVENLABS_API_KEY}`,
        },
      }
    );

    return response.data.voices.map((voice: any) => ({
      id: voice.voice_id,
      name: voice.name,
    }));
  } catch (error) {
    console.error('Error fetching voices:', error);
    return [];
  }
}

export async function generateAudio({
  text,
  voiceId,
  stability = 0.5,
  similarityBoost = 0.8,
}: GenerateAudioOptions): Promise<GenerateAudioResponse> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/text-to-speech/${voiceId}/stream`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style: 0.5,
          use_speaker_boost: true
        },
      },
      {
        headers: {
          'xi-api-key': `${ELEVENLABS_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        responseType: 'blob',
      }
    );

    const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);

    return { audioUrl };
  } catch (error) {
    console.error('Error generating audio:', error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || error.message;
      throw new Error(`音频生成失败: ${message}`);
    }
    throw new Error('音频生成失败，请稍后重试');
  }
}

// 清理音频 URL
export function cleanupAudioUrl(url: string) {
  URL.revokeObjectURL(url);
} 