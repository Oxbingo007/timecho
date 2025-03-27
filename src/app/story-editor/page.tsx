'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Send, Mic, MicOff, MessageSquare, History, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { chatWithAI } from '@/lib/ai-services'
import { Message, AIModel } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const AI_MODELS = [
  { id: 'gpt3.5', name: 'GPT-3.5', description: 'OpenAI GPT-3.5 Turbo' },
  { id: 'gpt4', name: 'GPT-4', description: 'OpenAI GPT-4 (付费)' },
  { id: 'deepseek', name: 'DeepSeek', description: 'DeepSeek Chat' },
  { id: 'qianwen', name: '通义千问', description: '阿里通义千问' },
] as const;

// 语音识别类型声明
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface InterviewRecord {
  id: string
  title: string
  date: string
  preview: string
}

export default function StoryEditor() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedModel, setSelectedModel] = useState<AIModel>('gpt3.5')
  const [isRecording, setIsRecording] = useState(false)
  const [showRecords, setShowRecords] = useState(false)
  const [records, setRecords] = useState<InterviewRecord[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  // 初始化消息
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: '欢迎来到生命故事访谈。我是您的AI访谈助手，很高兴能和您交流。我会帮助您整理和讲述您的人生故事。请问您想从哪里开始分享呢？比如，您可以先简单介绍一下自己。',
        timestamp: new Date()
      }
    ]);
  }, []);

  // 初始化语音识别
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'zh-CN';

        recognitionRef.current.onstart = () => {
          console.log('语音识别已启动');
          toast.success('开始录音');
          setIsRecording(true);
        };

        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result) => result.transcript)
            .join('');
          
          console.log('识别结果:', transcript);
          setInput((prev) => prev + transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          
          switch(event.error) {
            case 'not-allowed':
              toast.error('请允许使用麦克风权限');
              break;
            case 'no-speech':
              toast.error('没有检测到语音，请重试');
              break;
            case 'network':
              toast.error('网络错误，请检查网络连接');
              break;
            default:
              toast.error('语音识别出错，请重试');
          }
        };

        recognitionRef.current.onend = () => {
          console.log('语音识别已结束');
          setIsRecording(false);
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        };
      } else {
        console.error('浏览器不支持语音识别');
      }
    }
  }, []);

  // 切换语音识别
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error('您的浏览器不支持语音识别功能');
      return;
    }

    try {
      if (isRecording) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error('语音识别错误:', error);
      toast.error('启动语音识别失败，请重试');
      setIsRecording(false);
    }
  };

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const startNewChat = () => {
    setMessages([])
    setInput('')
    // 可以在这里添加一个系统提示消息
    const systemMessage: Message = {
      role: 'assistant',
      content: '您好，我是您的生命故事记录助手。请告诉我您想分享的故事，我会帮您记录下来。'
    }
    setMessages([systemMessage])
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model: selectedModel
        }),
      })

      if (!response.ok) {
        throw new Error('发送消息失败')
      }

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message
      }

      setMessages(prev => [...prev, assistantMessage])

      // 保存到访谈记录
      const newRecord: InterviewRecord = {
        id: Date.now().toString(),
        title: `访谈记录 ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString(),
        preview: userMessage.content
      }

      const updatedRecords = [...records, newRecord]
      setRecords(updatedRecords)
      localStorage.setItem('interviewRecords', JSON.stringify(updatedRecords))

    } catch (error) {
      console.error('Error:', error)
      toast.error('发送消息失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 导出访谈记录
  const exportInterview = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      })

      // Check if the response is JSON (error) or blob (document)
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const errorData = await response.json()
        throw new Error(errorData.error || '导出失败')
      }

      if (!response.ok) {
        throw new Error(`导出失败: ${response.status}`)
      }

      const blob = await response.blob()
      if (!blob.size) {
        throw new Error('导出的文件为空')
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `访谈记录_${new Date().toLocaleDateString('zh-CN')}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('访谈内容已导出')
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : '导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  // Load interview records from localStorage
  useEffect(() => {
    const loadRecords = () => {
      try {
        const savedRecords = localStorage.getItem('interviewRecords')
        if (savedRecords) {
          setRecords(JSON.parse(savedRecords))
        }
      } catch (error) {
        console.error('Error loading records:', error)
        toast.error('加载访谈记录失败')
      }
    }
    loadRecords()
  }, [])

  const handleExport = async (record: InterviewRecord) => {
    try {
      setIsExporting(true)
      const response = await fetch(`/api/dify/export?conversationId=${record.id}`)
      if (!response.ok) throw new Error('导出失败')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `访谈记录_${record.date}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('导出成功')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('导出失败')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = (record: InterviewRecord) => {
    try {
      const newRecords = records.filter(r => r.id !== record.id)
      setRecords(newRecords)
      localStorage.setItem('interviewRecords', JSON.stringify(newRecords))
      toast.success('删除成功')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('删除失败')
    }
  }

  const loadInterviewChat = (record: InterviewRecord) => {
    // TODO: 加载历史访谈内容到聊天界面
    toast.info('加载历史访谈记录')
  }

  return (
    <div className="container mx-auto p-4 h-[100dvh] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">故事编辑器</h1>
        <div className="flex items-center gap-4">
          <Select
            value={selectedModel}
            onValueChange={(value: AIModel) => setSelectedModel(value)}
          >
            <SelectTrigger className="w-[180px]">
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
          <Button variant="outline" onClick={() => setShowRecords(!showRecords)}>
            <History className="w-4 h-4 mr-2" />
            访谈记录
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4">
        {/* 主聊天区域 */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 p-4 mb-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="输入您的故事..."
              className="flex-1 resize-none min-h-[80px] sm:min-h-0"
              disabled={isLoading || isRecording}
            />
            <div className="flex flex-row sm:flex-col gap-2">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                onClick={toggleRecording}
                disabled={isLoading}
                className="flex-1 sm:flex-none"
              >
                {isRecording ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                {isRecording ? "停止录音" : "语音输入"}
              </Button>
              <Button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="flex-1 sm:flex-none"
              >
                <Send className="w-4 h-4 mr-2" />
                发送
              </Button>
            </div>
          </div>
        </div>

        {/* 访谈记录侧边栏 */}
        <Collapsible
          open={showRecords}
          onOpenChange={setShowRecords}
          className="w-full md:w-80 shrink-0"
        >
          <Card className="p-4">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between mb-4 cursor-pointer">
                <h2 className="text-lg font-semibold">访谈记录</h2>
                {showRecords ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {records.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  暂无访谈记录
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {records.map((record) => (
                    <Card key={record.id} className="p-3">
                      <div 
                        className="cursor-pointer mb-2"
                        onClick={() => loadInterviewChat(record)}
                      >
                        <h3 className="font-medium mb-1">{record.title || '未命名访谈'}</h3>
                        <p className="text-sm text-gray-500">{record.date}</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{record.preview}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleExport(record)}
                          disabled={isExporting}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          导出
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDelete(record)}
                        >
                          删除
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  )
} 