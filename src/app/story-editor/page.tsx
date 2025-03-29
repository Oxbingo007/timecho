'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Send, Mic, MicOff, MessageSquare, History, ChevronDown, ChevronUp, Plus, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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
import { XunfeiASR } from '@/lib/xunfei'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'

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
  messages: Message[]
  isSelected?: boolean
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
  const [currentInterviewId, setCurrentInterviewId] = useState<string | null>(null)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const xunfeiRef = useRef<XunfeiASR | null>(null)

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

  // 初始化音频上下文和分析器
  const initAudioContext = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('获取到麦克风权限');
      mediaStreamRef.current = stream;
      
      // 创建音频上下文和分析器
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // 创建 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // 处理录音数据
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // 录音结束时的处理
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        audioChunksRef.current = [];
        
        // 创建表单数据
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        
        try {
          const response = await fetch('http://localhost:8000/speech-to-text', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error('语音识别失败');
          }
          
          const data = await response.json();
          if (data.text) {
            setInput(prev => prev + data.text);
          }
        } catch (error) {
          console.error('语音识别错误:', error);
          toast.error('语音识别失败，请重试');
        }
      };
      
      // 开始音频可视化
      const updateAudioLevel = () => {
        if (!analyserRef.current || !isRecording) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((acc, value) => acc + value, 0) / dataArray.length;
        const level = Math.min(100, (average / 128) * 100);
        setAudioLevel(level);
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
      
    } catch (error) {
      console.error('初始化音频失败:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('请允许使用麦克风权限，并刷新页面重试');
      } else {
        toast.error('无法访问麦克风，请确保设备支持语音输入');
      }
    }
  };

  // 停止录音
  const stopRecording = () => {
    console.log('停止录音');
    setIsRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // 停止音频可视化
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // 停止麦克风
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('麦克风轨道已停止');
      });
      mediaStreamRef.current = null;
    }
    
    // 关闭音频上下文
    if (audioContextRef.current) {
      audioContextRef.current.close().then(() => {
        console.log('音频上下文已关闭');
      });
      audioContextRef.current = null;
    }
    
    // 重置状态
    setAudioLevel(0);
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  };

  // 初始化讯飞语音识别
  useEffect(() => {
    // 创建讯飞语音识别实例
    xunfeiRef.current = new XunfeiASR({
      appId: process.env.NEXT_PUBLIC_XUNFEI_APP_ID || '',
      apiKey: process.env.NEXT_PUBLIC_XUNFEI_API_KEY || '',
    })

    // 设置回调函数
    xunfeiRef.current.setOnLevelChange((level) => {
      setAudioLevel(level)
    })

    xunfeiRef.current.setOnResult((text) => {
      setInput(prev => prev + text)
    })

    xunfeiRef.current.setOnError((error) => {
      console.error('语音识别错误:', error)
      toast.error(error.message)
      setIsRecording(false)
    })

    return () => {
      if (xunfeiRef.current) {
        xunfeiRef.current.stopRecording()
      }
    }
  }, [])

  // 切换录音状态
  const toggleRecording = async () => {
    try {
      if (isRecording) {
        xunfeiRef.current?.stopRecording()
        setIsRecording(false)
      } else {
        await xunfeiRef.current?.startRecording()
        setIsRecording(true)
        toast.success('开始录音，请说话...')
      }
    } catch (error) {
      console.error('录音错误:', error)
      toast.error('启动录音失败，请重试')
      setIsRecording(false)
    }
  }

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 加载访谈记录
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const response = await fetch('/api/interviews')
        if (!response.ok) throw new Error('加载访谈记录失败')
        const data = await response.json()
        setRecords(data.interviews)
      } catch (error) {
        console.error('Error loading records:', error)
        toast.error('加载访谈记录失败')
      }
    }
    loadRecords()
  }, [])

  // 开始新访谈
  const startNewChat = async () => {
    try {
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `访谈记录 ${new Date().toLocaleDateString()}`,
        }),
      })

      if (!response.ok) throw new Error('创建访谈记录失败')
      const data = await response.json()
      
      setCurrentInterviewId(data.interview.id)
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '欢迎来到生命故事访谈。我是您的AI访谈助手，很高兴能和您交流。我会帮助您整理和讲述您的人生故事。请问您想从哪里开始分享呢？比如，您可以先简单介绍一下自己。',
        timestamp: new Date()
      }])
      setInput('')
    } catch (error) {
      console.error('Error creating interview:', error)
      toast.error('创建访谈记录失败')
    }
  }

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || isLoading || !currentInterviewId) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // 保存用户消息
      await fetch(`/api/interviews/${currentInterviewId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userMessage),
      })

      // 获取 AI 回复
      const aiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model: selectedModel
        }),
      })

      if (!aiResponse.ok) {
        throw new Error('发送消息失败')
      }

      const data = await aiResponse.json()
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }

      // 保存 AI 回复
      await fetch(`/api/interviews/${currentInterviewId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assistantMessage),
      })

      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error('Message error:', error)
      const errorMessage = error instanceof Error ? error.message : '发送消息失败'
      toast.error(errorMessage)
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  // 切换消息选择状态
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(messageId)) {
        newSelection.delete(messageId)
      } else {
        newSelection.add(messageId)
      }
      return newSelection
    })
  }

  // 生成访谈纪要
  const generateSummary = async () => {
    if (!currentInterviewId || selectedMessages.size === 0) {
      toast.error('请先选择要包含在纪要中的内容')
      return
    }

    try {
      setIsExporting(true)
      const response = await fetch(`/api/interviews/${currentInterviewId}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageIds: Array.from(selectedMessages)
        }),
      })

      if (!response.ok) throw new Error('生成纪要失败')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `访谈纪要_${new Date().toLocaleDateString('zh-CN')}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('纪要已生成')
    } catch (error) {
      console.error('Summary generation error:', error)
      toast.error('生成纪要失败')
    } finally {
      setIsExporting(false)
    }
  }

  // 加载历史访谈
  const loadInterviewChat = async (record: InterviewRecord) => {
    try {
      const response = await fetch(`/api/interviews/${record.id}/messages`)
      if (!response.ok) throw new Error('加载访谈内容失败')
      
      const data = await response.json()
      setMessages(data.messages)
      setCurrentInterviewId(record.id)
      setSelectedMessages(new Set())
      toast.success('加载访谈记录成功')
    } catch (error) {
      console.error('Error loading interview:', error)
      toast.error('加载访谈记录失败')
    }
  }

  // 导出访谈记录
  const handleExport = async (record: InterviewRecord) => {
    try {
      setIsExporting(true)
      const response = await fetch(`/api/interviews/${record.id}/export`)
      if (!response.ok) throw new Error('导出失败')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `访谈记录_${new Date().toLocaleDateString('zh-CN')}.docx`
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

  // 删除访谈记录
  const handleDelete = async (record: InterviewRecord) => {
    try {
      const response = await fetch(`/api/interviews/${record.id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('删除失败')
      
      const newRecords = records.filter(r => r.id !== record.id)
      setRecords(newRecords)
      toast.success('删除成功')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('删除失败')
    }
  }

  // 清理函数
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

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
                  className={`flex items-start gap-4 ${
                    message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <div className="flex-shrink-0">
                    <Avatar>
                      <AvatarFallback>
                        {message.role === 'assistant' ? 'AI' : '我'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Card className={`p-4 ${
                      message.role === 'assistant' ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="prose max-w-none">
                          {message.content}
                        </div>
                        <Checkbox
                          checked={selectedMessages.has(message.id)}
                          onCheckedChange={() => toggleMessageSelection(message.id)}
                        />
                      </div>
                    </Card>
                    <div className="text-xs text-gray-500">
                      {message.timestamp?.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </Card>

          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={generateSummary}
                disabled={isExporting || selectedMessages.size === 0}
              >
                <FileText className="w-4 h-4 mr-2" />
                生成纪要
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedMessages(new Set())}
                disabled={selectedMessages.size === 0}
              >
                清除选择
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
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
                {isRecording && (
                  <div className="absolute left-0 right-0 bottom-0">
                    <Progress value={audioLevel} className="h-1 bg-red-500" />
                  </div>
                )}
              </div>
              <div className="flex flex-row sm:flex-col gap-2">
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  onClick={toggleRecording}
                  disabled={isLoading}
                  className="flex-1 sm:flex-none relative"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4 mr-2" />
                      停止录音
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      语音输入
                    </>
                  )}
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