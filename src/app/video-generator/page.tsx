'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { generateVideo, checkVideoStatus, VideoGenerationError } from '@/lib/videoApi';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generationType, setGenerationType] = useState<'text' | 'image'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout>();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const checkGenerationStatus = useCallback(async (taskId: string) => {
    try {
      const response = await checkVideoStatus(taskId);
      if (response.status === 'completed' && response.videoUrl) {
        setGeneratedVideoUrl(response.videoUrl);
        setIsGenerating(false);
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
        }
        toast.success('视频生成成功！');
      } else if (response.status === 'failed') {
        setIsGenerating(false);
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
        }
        toast.error('视频生成失败');
      }
    } catch (error) {
      console.error('Error checking video status:', error);
      if (error instanceof VideoGenerationError) {
        toast.error(error.message);
      } else {
        toast.error('检查视频状态时出错');
      }
    }
  }, []);

  const handleGenerate = async () => {
    if (!prompt) {
      toast.error('请输入提示词');
      return;
    }

    if (generationType === 'image' && !uploadedImage) {
      toast.error('请上传参考图片');
      return;
    }

    setIsGenerating(true);
    setGeneratedVideoUrl(null);

    try {
      const response = await generateVideo({
        prompt,
        ...(generationType === 'image' && uploadedImage 
          ? { inputImage: uploadedImage.split(',')[1] }
          : {})
      });

      if (response.taskId) {
        statusCheckInterval.current = setInterval(
          () => checkGenerationStatus(response.taskId),
          5000
        );
      }
    } catch (error) {
      setIsGenerating(false);
      if (error instanceof VideoGenerationError) {
        toast.error(error.message);
      } else {
        toast.error('生成视频时出错');
      }
    }
  };

  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">AI 视频生成</h1>
      
      <div className="space-y-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button
                variant={generationType === 'text' ? 'default' : 'outline'}
                onClick={() => setGenerationType('text')}
              >
                文本生成
              </Button>
              <Button
                variant={generationType === 'image' ? 'default' : 'outline'}
                onClick={() => setGenerationType('image')}
              >
                图片生成
              </Button>
            </div>

            {generationType === 'image' && (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                >
                  上传参考图片
                </Button>
                {uploadedImage && (
                  <div className="mt-2">
                    <img
                      src={uploadedImage}
                      alt="Uploaded"
                      className="max-h-48 rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                提示词
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={generationType === 'text' 
                  ? "描述你想要生成的视频场景..."
                  : "描述如何基于上传的图片生成视频..."}
                rows={4}
                className="w-full"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? '生成中...' : '生成视频'}
            </Button>
          </div>
        </Card>

        {generatedVideoUrl && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">生成结果</h2>
            <video
              src={generatedVideoUrl}
              controls
              className="w-full rounded-lg"
            >
              Your browser does not support the video tag.
            </video>
          </Card>
        )}
      </div>
    </div>
  );
} 