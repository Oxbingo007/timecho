import axios from 'axios'
import { generateAudio } from './audioApi'

interface VideoSegment {
  id: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  duration: number;
}

interface ComposeVideoOptions {
  quality: '480p' | '720p' | '1080p';
}

export async function composeVideo(segments: VideoSegment[], options: ComposeVideoOptions): Promise<string> {
  try {
    // 1. 为每个片段生成音频
    const segmentsWithAudio = await Promise.all(
      segments.map(async (segment) => {
        if (!segment.text) return segment;
        
        try {
          const audioUrl = await generateAudio({
            text: segment.text,
            voiceId: 'pNInz6obpgDQGcFmaJgB' // 默认使用中文女声
          });
          return { ...segment, audioUrl };
        } catch (error) {
          console.error('为片段生成音频失败:', error);
          return segment;
        }
      })
    );

    // 2. 准备视频合成数据
    const videoData = {
      segments: segmentsWithAudio.map(segment => ({
        image: segment.imageUrl,
        audio: segment.audioUrl,
        duration: segment.duration
      })),
      options: {
        width: options.quality === '1080p' ? 1920 : options.quality === '720p' ? 1280 : 854,
        height: options.quality === '1080p' ? 1080 : options.quality === '720p' ? 720 : 480,
        fps: 30,
        format: 'mp4'
      }
    };

    // 3. 调用视频合成服务
    // TODO: 实现实际的视频合成服务调用
    // 这里我们先返回一个模拟的视频URL
    return Promise.resolve('https://example.com/video.mp4');

  } catch (error) {
    console.error('视频合成失败:', error);
    throw new Error('视频合成失败，请重试');
  }
}

// 用于检查视频合成进度的函数
export async function checkVideoProgress(jobId: string): Promise<number> {
  // TODO: 实现进度检查逻辑
  return Promise.resolve(0);
}

// 用于获取已完成视频的URL
export async function getVideoUrl(jobId: string): Promise<string> {
  // TODO: 实现获取视频URL的逻辑
  return Promise.resolve('');
}

interface VideoGenerationResponse {
  taskId: string;
  status: string;
  videoUrl?: string;
  error?: string;
}

export interface VideoGenerationOptions {
  prompt: string;
  referenceImage?: string; // Base64 encoded image for Subject Reference
  inputImage?: string;     // Base64 encoded image for Image to Video
}

export class VideoGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VideoGenerationError';
  }
}

export async function generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResponse> {
  const apiKey = process.env.NEXT_PUBLIC_PIAPI_KEY;
  if (!apiKey) {
    throw new VideoGenerationError('PIAPI API key is not configured');
  }

  try {
    // Determine which endpoint to use based on the provided options
    let endpoint = 'https://api.piapi.ai/hailuo/v1/text2video';
    let payload: any = { prompt: options.prompt };

    if (options.referenceImage) {
      endpoint = 'https://api.piapi.ai/hailuo/v1/subject2video';
      payload.reference_image = options.referenceImage;
    } else if (options.inputImage) {
      endpoint = 'https://api.piapi.ai/hailuo/v1/image2video';
      payload.input_image = options.inputImage;
    }

    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.data.error) {
      throw new VideoGenerationError(response.data.error);
    }

    return {
      taskId: response.data.task_id,
      status: response.data.status,
      videoUrl: response.data.video_url
    };
  } catch (error) {
    if (error instanceof VideoGenerationError) {
      throw error;
    }
    throw new VideoGenerationError(
      error instanceof Error ? error.message : 'Failed to generate video'
    );
  }
}

export async function checkVideoStatus(taskId: string): Promise<VideoGenerationResponse> {
  const apiKey = process.env.NEXT_PUBLIC_PIAPI_KEY;
  if (!apiKey) {
    throw new VideoGenerationError('PIAPI API key is not configured');
  }

  try {
    const response = await axios.get(
      `https://api.piapi.ai/hailuo/v1/tasks/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    if (response.data.error) {
      throw new VideoGenerationError(response.data.error);
    }

    return {
      taskId: response.data.task_id,
      status: response.data.status,
      videoUrl: response.data.video_url
    };
  } catch (error) {
    if (error instanceof VideoGenerationError) {
      throw error;
    }
    throw new VideoGenerationError(
      error instanceof Error ? error.message : 'Failed to check video status'
    );
  }
} 