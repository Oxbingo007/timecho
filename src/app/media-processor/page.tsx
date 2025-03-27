'use client'

import React, { useState, useCallback } from 'react'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import { enhanceImage } from '@/lib/imageApi'

interface ProcessedImage {
  originalUrl: string;
  enhancedUrl?: string;
  isProcessing: boolean;
  file: File;
}

export default function MediaProcessor() {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      originalUrl: URL.createObjectURL(file),
      isProcessing: false,
      file
    }))
    setImages(prev => [...prev, ...newImages])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const processImage = async (index: number) => {
    setError(null)
    setImages(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], isProcessing: true }
      return updated
    })

    try {
      const result = await enhanceImage(images[index].file)
      
      setImages(prev => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          enhancedUrl: result.enhancedUrl,
          isProcessing: false
        }
        return updated
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片处理失败，请重试')
      setImages(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], isProcessing: false }
        return updated
      })
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].originalUrl)
      if (updated[index].enhancedUrl) {
        URL.revokeObjectURL(updated[index].enhancedUrl)
      }
      updated.splice(index, 1)
      return updated
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">照片修复</h1>

      {/* 上传区域 */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-500'}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-gray-600">
            <span className="text-primary-600">点击上传</span> 或拖放照片到此处
          </div>
          <p className="text-sm text-gray-500">支持 JPG、PNG 格式，单张最大 10MB</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* 图片预览区域 */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image, index) => (
          <div key={index} className="relative bg-white rounded-lg shadow-sm overflow-hidden">
            <button
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 z-10 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="aspect-w-4 aspect-h-3 relative">
              <Image
                src={image.enhancedUrl || image.originalUrl}
                alt="上传的照片"
                fill
                className="object-cover"
              />
              {image.isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                </div>
              )}
            </div>
            
            <div className="p-4">
              <button
                onClick={() => processImage(index)}
                disabled={image.isProcessing || !!image.enhancedUrl}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {image.isProcessing ? '处理中...' : 
                 image.enhancedUrl ? '已完成' : '开始修复'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 