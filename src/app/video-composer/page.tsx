'use client'

import React, { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { composeVideo } from '@/lib/videoApi'

interface VideoSegment {
  id: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  duration: number;
}

export default function VideoComposer() {
  const [segments, setSegments] = useState<VideoSegment[]>([])
  const [isComposing, setIsComposing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [quality, setQuality] = useState<'480p' | '720p' | '1080p'>('720p')

  const onDrop = (acceptedFiles: File[]) => {
    // 处理上传的图片文件
    acceptedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const newSegment: VideoSegment = {
          id: Math.random().toString(36).substring(7),
          text: '',
          imageUrl: reader.result as string,
          duration: 5 // 默认5秒
        }
        setSegments(prev => [...prev, newSegment])
      }
      reader.readAsDataURL(file)
    })
  }

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    onDrop
  })

  const handleTextChange = (id: string, text: string) => {
    setSegments(prev =>
      prev.map(segment =>
        segment.id === id ? { ...segment, text } : segment
      )
    )
  }

  const handleDurationChange = (id: string, duration: number) => {
    setSegments(prev =>
      prev.map(segment =>
        segment.id === id ? { ...segment, duration } : segment
      )
    )
  }

  const handleComposeVideo = async () => {
    if (segments.length === 0) return

    setIsComposing(true)
    try {
      // 验证所有片段
      const invalidSegments = segments.filter(
        segment => !segment.imageUrl || !segment.text
      )
      if (invalidSegments.length > 0) {
        throw new Error('请确保所有片段都包含图片和文本')
      }

      // 调用视频合成 API
      const videoUrl = await composeVideo(segments, { quality })
      setPreviewUrl(videoUrl)
      
    } catch (error) {
      console.error('视频合成失败:', error)
      alert(error instanceof Error ? error.message : '视频合成失败，请重试')
    } finally {
      setIsComposing(false)
    }
  }

  const handleSegmentReorder = (dragIndex: number, hoverIndex: number) => {
    const newSegments = [...segments]
    const dragSegment = newSegments[dragIndex]
    newSegments.splice(dragIndex, 1)
    newSegments.splice(hoverIndex, 0, dragSegment)
    setSegments(newSegments)
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">视频合成</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧：片段编辑区 */}
        <div className="space-y-6">
          <div
            {...getRootProps()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500"
          >
            <input {...getInputProps()} />
            <p className="text-gray-600">
              拖放图片到此处，或点击选择图片
            </p>
            <p className="text-sm text-gray-500 mt-2">
              支持 PNG、JPG、JPEG、WEBP 格式
            </p>
          </div>

          <div className="space-y-4">
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                className="bg-white rounded-lg shadow p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">片段 {index + 1}</span>
                  <button
                    onClick={() => {
                      setSegments(prev =>
                        prev.filter(s => s.id !== segment.id)
                      )
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    删除
                  </button>
                </div>

                {segment.imageUrl && (
                  <img
                    src={segment.imageUrl}
                    alt={`片段 ${index + 1}`}
                    className="w-full h-40 object-cover rounded"
                  />
                )}

                <textarea
                  value={segment.text}
                  onChange={(e) => handleTextChange(segment.id, e.target.value)}
                  placeholder="输入这个片段的旁白文本..."
                  className="w-full p-2 border rounded"
                  rows={3}
                />

                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">
                    持续时间（秒）：
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={segment.duration}
                    onChange={(e) =>
                      handleDurationChange(segment.id, parseInt(e.target.value))
                    }
                    className="w-20 p-1 border rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：预览和控制区 */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">视频预览</h2>
            {previewUrl ? (
              <video
                src={previewUrl}
                controls
                className="w-full rounded"
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 rounded flex items-center justify-center">
                <p className="text-gray-500">暂无预览</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">合成设置</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  视频质量
                </label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as '480p' | '720p' | '1080p')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="480p">480p</option>
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                </select>
              </div>

              <button
                onClick={handleComposeVideo}
                disabled={segments.length === 0 || isComposing}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isComposing ? '合成中...' : '开始合成'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 