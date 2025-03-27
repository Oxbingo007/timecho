'use client'

import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { 
  MessageSquare, 
  BookText, 
  Image, 
  Mic, 
  Video,
  Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">时光回声</h1>
      <p className="text-gray-500 mb-6">用 AI 技术为您珍贵的回忆赋予新的生命</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/story-editor" className="block">
          <Card className="h-full p-6 hover:bg-gray-50 transition-colors cursor-pointer">
            <MessageSquare className="w-8 h-8 mb-4" />
            <h2 className="text-xl font-semibold mb-2">故事编辑器</h2>
            <p className="text-gray-500">与 AI 对话，记录生命故事</p>
          </Card>
        </Link>

        <Link href="/biography-editor" className="block">
          <Card className="h-full p-6 hover:bg-gray-50 transition-colors cursor-pointer">
            <BookText className="w-8 h-8 mb-4" />
            <h2 className="text-xl font-semibold mb-2">传记编辑器</h2>
            <p className="text-gray-500">将访谈记录转化为精美传记</p>
          </Card>
        </Link>

        <div className="block relative">
          <Card className={cn(
            "h-full p-6 cursor-not-allowed bg-gray-50",
            "relative overflow-hidden"
          )}>
            <div className="absolute top-3 right-3">
              <Lock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="absolute -rotate-45 text-xs font-medium text-white bg-gray-400 py-1 px-6 -right-8 top-4">
              即将推出
            </div>
            <Image className="w-8 h-8 mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2 text-gray-400">照片修复</h2>
            <p className="text-gray-400">AI 修复老照片，创建动态影像效果</p>
          </Card>
        </div>

        <div className="block relative">
          <Card className={cn(
            "h-full p-6 cursor-not-allowed bg-gray-50",
            "relative overflow-hidden"
          )}>
            <div className="absolute top-3 right-3">
              <Lock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="absolute -rotate-45 text-xs font-medium text-white bg-gray-400 py-1 px-6 -right-8 top-4">
              即将推出
            </div>
            <Mic className="w-8 h-8 mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2 text-gray-400">AI 配音</h2>
            <p className="text-gray-400">生成自然的旁白配音，或克隆真实声音</p>
          </Card>
        </div>

        <div className="block relative">
          <Card className={cn(
            "h-full p-6 cursor-not-allowed bg-gray-50",
            "relative overflow-hidden"
          )}>
            <div className="absolute top-3 right-3">
              <Lock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="absolute -rotate-45 text-xs font-medium text-white bg-gray-400 py-1 px-6 -right-8 top-4">
              即将推出
            </div>
            <Video className="w-8 h-8 mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2 text-gray-400">视频合成</h2>
            <p className="text-gray-400">将故事、照片、配音合成为完整的回忆视频</p>
          </Card>
        </div>
      </div>
    </main>
  )
} 