'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Send, Mic, MicOff, MessageSquare, History, ChevronDown, ChevronUp, Plus } from 'lucide-react'
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
  const [audioLevel, setAudioLevel] = useState(0)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

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
        console.log('初始化语音识别');
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false; // 在移动端设置为 false 可能更稳定
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'zh-CN';
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onstart = async () => {
          console.log('语音识别已启动');
          toast.success('开始录音，请说话...');
          setIsRecording(true);
          setInput(''); // 清空输入框
          
          try {
            // 获取麦克风权限并开始音频可视化
            const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              } 
            });
            console.log('获取到麦克风权限');
            mediaStreamRef.current = stream;
            
            // 创建音频上下文
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            
            source.connect(analyser);
            analyser.fftSize = 256;
            
            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            
            // 开始音频可视化
            const updateAudioLevel = () => {
              if (!analyserRef.current || !isRecording) return;
              
              const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
              analyserRef.current.getByteFrequencyData(dataArray);
              
              // 计算音量级别（0-100）
              const average = dataArray.reduce((acc, value) => acc + value, 0) / dataArray.length;
              const level = Math.min(100, (average / 128) * 100);
              console.log('音量级别:', level);
              setAudioLevel(level);
              
              animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
            };
            
            updateAudioLevel();
          } catch (error) {
            console.error('获取麦克风权限失败:', error);
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
              toast.error('请允许使用麦克风权限，并刷新页面重试');
            } else {
              toast.error('无法访问麦克风，请确保设备支持语音输入');
            }
            stopRecording();
          }
        };

        recognitionRef.current.onresult = (event: any) => {
          console.log('收到语音识别结果');
          const results = event.results;
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < results.length; i++) {
            const transcript = results[i][0].transcript;
            if (results[i].isFinal) {
              console.log('最终识别结果:', transcript);
              finalTranscript += transcript;
              // 在移动端，每次得到最终结果后自动重新开始录音
              if (!results[i + 1]) {
                try {
                  recognitionRef.current?.start();
                } catch (error) {
                  console.error('重新启动语音识别失败:', error);
                }
              }
            } else {
              console.log('临时识别结果:', transcript);
              interimTranscript += transcript;
            }
          }

          // 更新输入框
          if (finalTranscript) {
            console.log('更新输入框:', finalTranscript);
            setInput(prev => {
              const newValue = prev + finalTranscript;
              console.log('新的输入框内容:', newValue);
              return newValue;
            });
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('语音识别错误:', event.error);
          
          switch(event.error) {
            case 'not-allowed':
              toast.error('请允许使用麦克风权限，并刷新页面重试');
              break;
            case 'no-speech':
              toast.error('没有检测到语音，请重试');
              // 在移动端，no-speech 错误后自动重新开始
              try {
                recognitionRef.current?.start();
              } catch (error) {
                console.error('重新启动语音识别失败:', error);
              }
              break;
            case 'network':
              toast.error('网络错误，请检查网络连接');
              break;
            case 'aborted':
              // 忽略中止错误，这通常是用户手动停止的结果
              break;
            default:
              toast.error(`语音识别出错: ${event.error}`);
          }
          
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            stopRecording();
          }
        };

        recognitionRef.current.onend = () => {
          console.log('语音识别已结束');
          // 只有在用户主动停止时才调用 stopRecording
          if (!isRecording) {
            stopRecording();
          }
        };
      } else {
        console.error('浏览器不支持语音识别');
        toast.error('您的浏览器不支持语音识别功能，请使用 Chrome 浏览器');
      }
    }

    return () => {
      stopRecording();
    };
  }, [isRecording]); // 添加 isRecording 作为依赖项

  const stopRecording = () => {
    console.log('停止录音');
    setIsRecording(false);
    
    // 停止语音识别
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('停止语音识别时出错:', error);
      }
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
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error('您的浏览器不支持语音识别功能，请使用 Chrome 浏览器');
      return;
    }

    try {
      if (isRecording) {
        console.log('停止录音...');
        stopRecording();
      } else {
        console.log('开始录音...');
        // 在移动端，每次开始录音前检查和请求权限
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
              recognitionRef.current.start();
            })
            .catch((error) => {
              console.error('获取麦克风权限失败:', error);
              toast.error('请允许使用麦克风权限，并刷新页面重试');
            });
        } else {
          toast.error('您的设备不支持语音输入');
        }
      }
    } catch (error) {
      console.error('语音识别错误:', error);
      toast.error('启动语音识别失败，请刷新页面重试');
      stopRecording();
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
                  <Progress value={audioLevel} className="h-1" />
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