# 语音识别后端服务

这是一个使用 Whisper.cpp 的本地语音识别服务。

## 安装步骤

1. 确保系统已安装 Python 3.8 或更高版本

2. 创建虚拟环境并激活：
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

## 运行服务

激活虚拟环境后，运行：
```bash
python main.py
```

服务将在 http://localhost:8000 启动。

## API 接口

### POST /speech-to-text

接收 WAV 格式的音频文件，返回识别的文本。

请求示例：
```bash
curl -X POST http://localhost:8000/speech-to-text \
  -F "audio=@recording.wav"
```

响应示例：
```json
{
  "text": "识别的文本内容"
}
```

## 注意事项

1. 音频输入要求：
   - 格式：WAV
   - 采样率：16kHz（推荐）
   - 声道：单声道或立体声（会自动转换为单声道）

2. 首次运行时会自动下载 Whisper 模型文件 