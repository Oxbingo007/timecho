import CryptoJS from 'crypto-js'

interface XunfeiConfig {
  appId: string
  apiSecret: string
}

interface XunfeiResponse {
  code: number
  message?: string
  data?: {
    status: number  // 状态码，0-成功，1-失败，2-结束
    result?: {
      ws?: Array<{
        cw: Array<{
          w: string
        }>
      }>
      text?: string[]  // 实时语音转写的文本结果
      duration?: number
      end?: number
      begin?: number
    }
  }
}

export class XunfeiASR {
  private appId: string
  private apiSecret: string
  private ws: WebSocket | null = null
  private isRecording = false
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private mediaStream: MediaStream | null = null
  private onLevelChange?: (level: number) => void
  private onResult?: (text: string) => void
  private onError?: (error: Error) => void
  private animationFrame: number | null = null

  constructor(config: XunfeiConfig) {
    this.appId = config.appId
    this.apiSecret = config.apiSecret
  }

  // 生成鉴权url
  private getAuthUrl(): string {
    const host = 'wss://rtasr.xfyun.cn/v1/ws'  // 更新为正确的WebSocket地址
    const ts = Math.floor(Date.now() / 1000)  // 当前时间戳（秒）
    
    // 生成原始字符串
    const signatureOrigin = `appid=${this.appId}&ts=${ts}`
    // 使用HMAC-SHA1算法
    const signatureSha = CryptoJS.HmacSHA1(signatureOrigin, this.apiSecret)
    const signature = CryptoJS.enc.Base64.stringify(signatureSha)
    
    return `${host}?appid=${this.appId}&ts=${ts}&signa=${encodeURIComponent(signature)}`
  }

  // 初始化音频上下文
  private async initAudioContext() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,  // 必须是16k采样率
          channelCount: 1,    // 必须是单声道
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      this.mediaStream = stream
      this.audioContext = new AudioContext()
      this.analyser = this.audioContext.createAnalyser()
      const source = this.audioContext.createMediaStreamSource(stream)
      source.connect(this.analyser)
      this.analyser.fftSize = 256

      // 检查支持的音频格式
      const mimeTypes = [
        'audio/wav',
        'audio/webm',
        'audio/webm;codecs=pcm',
        'audio/ogg;codecs=opus'
      ]
      
      // 确保 MediaRecorder 在浏览器中可用
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('您的浏览器不支持 MediaRecorder API')
      }
      
      const supportedType = mimeTypes.find(type => {
        try {
          return MediaRecorder.isTypeSupported(type)
        } catch (e) {
          return false
        }
      })

      if (!supportedType) {
        throw new Error('浏览器不支持任何可用的音频格式')
      }

      // 创建 MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedType
      })

      // 处理音频数据
      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
          try {
            // 将音频数据转换为PCM格式
            const arrayBuffer = await event.data.arrayBuffer()
            const audioContext = new AudioContext({ sampleRate: 16000 })
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
            
            // 获取PCM数据
            const pcmData = audioBuffer.getChannelData(0)
            const samples = new Int16Array(pcmData.length)
            
            // 将Float32Array转换为Int16Array
            for (let i = 0; i < pcmData.length; i++) {
              const s = Math.max(-1, Math.min(1, pcmData[i]))
              samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
            }
            
            // 发送音频数据到讯飞服务器
            if (this.ws?.readyState === WebSocket.OPEN) {
              // 发送数据帧
              const frameData = {
                common: {
                  app_id: this.appId
                },
                business: {
                  language: 'zh_cn',
                  domain: 'iat',
                  accent: 'mandarin',
                  format: 'audio/L16;rate=16000',
                  vad_eos: 3000
                },
                data: {
                  status: 1, // 1表示还在传输数据
                  format: 'audio/L16;rate=16000',
                  encoding: 'raw',
                  audio: Array.from(samples)
                }
              }
              this.ws.send(JSON.stringify(frameData))
            }
          } catch (error) {
            console.error('处理音频数据失败:', error)
          }
        }
      }

      // 开始音频可视化
      this.startVisualization()
    } catch (error) {
      console.error('初始化音频失败:', error)
      this.onError?.(new Error('无法访问麦克风，请确保允许使用麦克风权限'))
    }
  }

  // 开始音频可视化
  private startVisualization() {
    const updateLevel = () => {
      if (!this.analyser || !this.isRecording) {
        if (this.animationFrame) {
          cancelAnimationFrame(this.animationFrame)
          this.animationFrame = null
        }
        return
      }

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
      this.analyser.getByteFrequencyData(dataArray)
      
      const average = dataArray.reduce((acc, value) => acc + value, 0) / dataArray.length
      const level = Math.min(100, (average / 128) * 100)
      
      this.onLevelChange?.(level)
      this.animationFrame = requestAnimationFrame(updateLevel)
    }

    this.animationFrame = requestAnimationFrame(updateLevel)
  }

  // 开始录音
  async startRecording() {
    if (this.isRecording) return

    try {
      // 初始化音频
      if (!this.audioContext) {
        await this.initAudioContext()
      }

      // 连接讯飞服务器
      const url = this.getAuthUrl()
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log('WebSocket连接已建立')
        
        // 发送开始帧
        const params = {
          common: {
            app_id: this.appId
          },
          business: {
            language: 'zh_cn',
            domain: 'iat',
            accent: 'mandarin',
            format: 'audio/L16;rate=16000',
            vad_eos: 3000
          },
          data: {
            status: 0, // 0表示第一帧音频
            format: 'audio/L16;rate=16000',
            encoding: 'raw',
            audio: ''  // 第一帧不发送音频数据
          }
        }

        if (this.ws) {
          this.ws.send(JSON.stringify(params))
        }
        
        // 开始录音
        if (this.mediaRecorder) {
          this.isRecording = true
          this.mediaRecorder.start(40)  // 每40ms发送一次数据
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data) as XunfeiResponse
          
          if (result.code !== 0) {
            this.onError?.(new Error(result.message || '语音识别失败'))
            return
          }

          // 处理实时语音转写的结果
          if (result.data) {
            if (result.data.status === 2) {
              // 说明是最后一条结果
              console.log('语音识别结束')
            }
            
            if (result.data.result?.text) {
              const text = result.data.result.text.join('')
              if (text.trim()) {
                this.onResult?.(text)
              }
            }
          }
        } catch (error) {
          console.error('解析识别结果失败:', error)
          this.onError?.(new Error('解析识别结果失败'))
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error)
        this.onError?.(new Error('连接服务器失败'))
      }

      this.ws.onclose = () => {
        console.log('WebSocket连接已关闭')
        if (this.isRecording) {
          this.stopRecording()
        }
      }

    } catch (error) {
      console.error('启动录音失败:', error)
      this.onError?.(new Error('启动录音失败'))
    }
  }

  // 停止录音
  stopRecording() {
    // 发送结束帧
    if (this.ws?.readyState === WebSocket.OPEN) {
      const endFrame = {
        common: {
          app_id: this.appId
        },
        business: {
          language: 'zh_cn',
          domain: 'iat',
          accent: 'mandarin',
          format: 'audio/L16;rate=16000',
          vad_eos: 3000
        },
        data: {
          status: 2, // 2表示最后一帧音频
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: ''  // 结束帧不发送音频数据
        }
      }
      this.ws.send(JSON.stringify(endFrame))
    }

    this.isRecording = false

    // 停止动画帧
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }

    // 停止 MediaRecorder
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop()
    }

    // 关闭 WebSocket 连接
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    // 停止所有音频轨道
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    // 关闭音频上下文
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
      this.analyser = null
    }

    // 重置状态
    this.mediaRecorder = null
    this.onLevelChange?.(0)
  }

  // 设置音量变化回调
  setOnLevelChange(callback: (level: number) => void) {
    this.onLevelChange = callback
  }

  // 设置识别结果回调
  setOnResult(callback: (text: string) => void) {
    this.onResult = callback
  }

  // 设置错误回调
  setOnError(callback: (error: Error) => void) {
    this.onError = callback
  }
} 