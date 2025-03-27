'use client'

import React, { useState, useEffect, useRef } from 'react'
import { generateAudio, cleanupAudioUrl, VOICE_OPTIONS, cloneVoice, getUserVoices } from '@/lib/audioApi'

interface AudioGeneration {
  id: string;
  text: string;
  audioUrl?: string;
  isProcessing: boolean;
  error?: string;
}

interface CustomVoice {
  id: string;
  name: string;
}

export default function VoiceGenerator() {
  const [text, setText] = useState('')
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id)
  const [speakingRate, setSpeakingRate] = useState(1.0)
  const [generations, setGenerations] = useState<AudioGeneration[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([])
  const [isCloning, setIsCloning] = useState(false)
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [cloneName, setCloneName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  // 加载用户的自定义声音
  useEffect(() => {
    loadUserVoices()
  }, [])

  const loadUserVoices = async () => {
    const voices = await getUserVoices()
    setCustomVoices(voices)
  }

  // 清理音频 URL
  useEffect(() => {
    return () => {
      generations.forEach(gen => {
        if (gen.audioUrl) {
          cleanupAudioUrl(gen.audioUrl)
        }
      })
    }
  }, [])

  const handleCloneVoice = async () => {
    if (!cloneName || selectedFiles.length === 0 || isCloning) return
    
    setIsCloning(true)
    try {
      const result = await cloneVoice(cloneName, selectedFiles)
      await loadUserVoices() // 重新加载声音列表
      setSelectedVoice(result.voiceId) // 自动选择新克隆的声音
      setShowCloneModal(false)
      setCloneName('')
      setSelectedFiles([])
    } catch (err) {
      alert(err instanceof Error ? err.message : '声音克隆失败')
    } finally {
      setIsCloning(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }

  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return

    setIsGenerating(true)
    const generationId = Date.now().toString()

    setGenerations(prev => [
      {
        id: generationId,
        text: text.trim(),
        isProcessing: true
      },
      ...prev
    ])

    try {
      const response = await generateAudio({
        text: text.trim(),
        voiceId: selectedVoice
      })

      setGenerations(prev => prev.map(gen => 
        gen.id === generationId
          ? { ...gen, audioUrl: response.audioUrl, isProcessing: false }
          : gen
      ))
    } catch (err) {
      setGenerations(prev => prev.map(gen => 
        gen.id === generationId
          ? { ...gen, error: err instanceof Error ? err.message : '生成失败', isProcessing: false }
          : gen
      ))
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePlay = (audioUrl: string, id: string) => {
    if (!audioRefs.current[id]) {
      audioRefs.current[id] = new Audio(audioUrl)
    }
    audioRefs.current[id].play()
  }

  const handlePause = (id: string) => {
    if (audioRefs.current[id]) {
      audioRefs.current[id].pause()
    }
  }

  const handleDelete = (id: string, audioUrl?: string) => {
    if (audioUrl) {
      cleanupAudioUrl(audioUrl)
    }
    if (audioRefs.current[id]) {
      audioRefs.current[id].pause()
      delete audioRefs.current[id]
    }
    setGenerations(prev => prev.filter(gen => gen.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">AI 配音</h1>

      <div className="space-y-6">
        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
              文本内容
            </label>
            <textarea
              id="text"
              rows={4}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="请输入要转换为语音的文本..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <p className="mt-2 text-sm text-gray-500">
              支持中文和英文，建议每段文本不超过 2000 字
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="voice" className="block text-sm font-medium text-gray-700">
                  选择声音
                </label>
                <button
                  onClick={() => setShowCloneModal(true)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  + 克隆我的声音
                </button>
              </div>
              <select
                id="voice"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
              >
                <optgroup label="预设声音">
                  {VOICE_OPTIONS.map(voice => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                    </option>
                  ))}
                </optgroup>
                {customVoices.length > 0 && (
                  <optgroup label="我的声音">
                    {customVoices.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                所有声音都支持中文和英文
              </p>
            </div>

            <div>
              <label htmlFor="speed" className="block text-sm font-medium text-gray-700 mb-2">
                语音风格
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">稳定性</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value="0.5"
                    disabled
                    className="block w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">相似度</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value="0.8"
                    disabled
                    className="block w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {text.length > 0 && (
                <span>当前文本长度: {text.length} 字</span>
              )}
            </div>
            <button
              onClick={handleGenerate}
              disabled={!text.trim() || isGenerating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isGenerating ? '生成中...' : '生成语音'}
            </button>
          </div>
        </div>

        {/* 生成历史 */}
        <div className="space-y-4">
          {generations.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              还没有生成任何语音，开始创建您的第一个语音吧！
            </div>
          ) : (
            generations.map(gen => (
              <div key={gen.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-4">
                    <p className="text-sm text-gray-600 whitespace-pre-line">{gen.text}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(gen.id, gen.audioUrl)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {gen.isProcessing ? (
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent mr-2"></div>
                    生成中...
                  </div>
                ) : gen.error ? (
                  <div className="mt-2 text-sm text-red-600">{gen.error}</div>
                ) : gen.audioUrl && (
                  <div className="mt-2 flex items-center space-x-2">
                    <button
                      onClick={() => handlePlay(gen.audioUrl!, gen.id)}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handlePause(gen.id)}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 克隆声音模态框 */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">克隆我的声音</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  声音名称
                </label>
                <input
                  type="text"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="为您的声音起个名字"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上传录音样本
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                <p className="mt-2 text-sm text-gray-500">
                  上传1-10个录音样本（MP3格式），每个文件不超过10MB，总时长建议在30秒以上
                </p>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCloneModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleCloneVoice}
                  disabled={!cloneName || selectedFiles.length === 0 || isCloning}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isCloning ? '克隆中...' : '开始克隆'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 