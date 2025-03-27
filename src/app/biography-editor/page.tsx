'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Save } from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AIModel } from '@/lib/types'

const AI_MODELS = [
  { id: 'gpt3.5', name: 'GPT-3.5', description: 'OpenAI GPT-3.5 Turbo' },
  { id: 'gpt4', name: 'GPT-4', description: 'OpenAI GPT-4 (付费)' },
  { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek Chat' },
  { id: 'qianwen', name: '通义千问', description: '阿里通义千问' },
] as const;

const BIOGRAPHY_STYLES = [
  { 
    id: 'chronological',
    name: '编年体',
    description: '按时间顺序记述生平事迹',
    prompt: '请按照时间顺序组织传记内容，突出重要的人生阶段和关键事件。'
  },
  {
    id: 'thematic',
    name: '主题式',
    description: '按不同主题板块组织内容',
    prompt: '请按照不同主题（如教育、事业、家庭等）组织传记内容，突出人物在各个方面的经历和成就。'
  },
  {
    id: 'literary',
    name: '文学性',
    description: '富有文学性的叙事风格',
    prompt: '请采用富有文学性的叙事手法，注重情节铺陈和细节描写，使传记更具可读性和艺术性。'
  },
  {
    id: 'psychological',
    name: '心理分析',
    description: '注重心理活动的刻画',
    prompt: '请注重描写人物的心理活动和性格发展，深入分析重要选择背后的思考过程和情感变化。'
  }
] as const;

type BiographyStyle = typeof BIOGRAPHY_STYLES[number]['id'];

export default function BiographyEditor() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState<BiographyStyle>('chronological')
  const [selectedModel, setSelectedModel] = useState<AIModel>('gpt3.5')
  const [biography, setBiography] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)

  // 上传访谈记录
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const messages = JSON.parse(text)

      setIsLoading(true)
      const selectedStylePrompt = BIOGRAPHY_STYLES.find(style => style.id === selectedStyle)?.prompt || ''

      const response = await fetch('/api/biography/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: selectedModel,
          style: selectedStyle,
          stylePrompt: selectedStylePrompt
        }),
      })

      if (!response.ok) {
        throw new Error('生成传记失败')
      }

      const data = await response.json()
      setBiography(data.biography)
      setIsEditing(true)
      toast.success('传记生成成功')
    } catch (error) {
      console.error('Error generating biography:', error)
      toast.error('生成传记失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 保存传记
  const saveBiography = async () => {
    try {
      const blob = new Blob([biography], { type: 'text/plain;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `传记_${new Date().toLocaleDateString('zh-CN')}.txt`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('传记已保存')
    } catch (error) {
      console.error('Error saving biography:', error)
      toast.error('保存失败，请重试')
    }
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 h-[100dvh] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">传记编辑器</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex gap-2 w-full sm:w-auto">
            <Select
              value={selectedModel}
              onValueChange={(value: AIModel) => setSelectedModel(value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="选择 AI 模型" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-gray-500">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedStyle}
              onValueChange={(value: BiographyStyle) => setSelectedStyle(value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="选择写作风格" />
              </SelectTrigger>
              <SelectContent>
                {BIOGRAPHY_STYLES.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{style.name}</span>
                      <span className="text-xs text-gray-500">{style.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="relative"
              disabled={isLoading}
            >
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">上传访谈</span>
              <span className="sm:hidden">上传</span>
            </Button>
            {biography && (
              <Button
                onClick={saveBiography}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">保存传记</span>
                <span className="sm:hidden">保存</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        {biography ? (
          <div className="flex-1 p-4 overflow-y-auto">
            <textarea
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              className="w-full h-full min-h-[500px] p-4 text-base leading-relaxed resize-none focus:outline-none"
              placeholder="传记内容将在这里显示..."
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4" />
              <p>上传访谈记录开始创作传记</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
} 