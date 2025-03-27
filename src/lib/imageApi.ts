import axios from 'axios';

const REPLICATE_API_KEY = process.env.NEXT_PUBLIC_REPLICATE_API_KEY;
const API_BASE_URL = 'https://api.replicate.com/v1';

interface EnhanceImageResponse {
  enhancedUrl: string;
}

export async function enhanceImage(imageFile: File): Promise<EnhanceImageResponse> {
  try {
    // 1. 将图片转换为 base64
    const base64Image = await fileToBase64(imageFile);
    
    // 2. 调用 Replicate API 进行图片修复
    const response = await axios.post(
      `${API_BASE_URL}/predictions`,
      {
        version: "9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3",
        input: {
          image: base64Image,
          scale: 2,
          face_enhance: true,
          background_enhance: true
        }
      },
      {
        headers: {
          'Authorization': `Token ${REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // 3. 获取处理结果
    const prediction = response.data;
    
    // 4. 轮询等待处理完成
    const result = await pollPrediction(prediction.id);
    
    return {
      enhancedUrl: result.output
    };
  } catch (error) {
    console.error('Error enhancing image:', error);
    throw new Error('图片处理失败，请稍后重试');
  }
}

async function pollPrediction(predictionId: string): Promise<any> {
  const maxAttempts = 30;
  const interval = 2000; // 2 seconds
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await axios.get(
      `${API_BASE_URL}/predictions/${predictionId}`,
      {
        headers: {
          'Authorization': `Token ${REPLICATE_API_KEY}`,
        },
      }
    );
    
    const prediction = response.data;
    
    if (prediction.status === 'succeeded') {
      return prediction;
    }
    
    if (prediction.status === 'failed') {
      throw new Error('图片处理失败');
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('处理超时，请重试');
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // 移除 Data URL 的前缀（例如 "data:image/jpeg;base64,"）
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
} 