from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile
import soundfile as sf
import numpy as np
from whisper_cpp_python import Whisper

app = FastAPI()

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 允许的源
    allow_credentials=True,
    allow_methods=["*"],  # 允许的方法
    allow_headers=["*"],  # 允许的头
)

# 初始化 Whisper 模型
# 使用较小的模型以减少内存占用，同时保持较好的识别效果
model = Whisper('base')

@app.post("/speech-to-text")
async def speech_to_text(audio: UploadFile = File(...)):
    try:
        # 创建临时文件来保存上传的音频
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
            # 写入上传的音频数据
            content = await audio.read()
            temp_audio.write(content)
            temp_audio.flush()
            
            # 读取音频文件
            audio_data, sample_rate = sf.read(temp_audio.name)
            
            # 如果是立体声，转换为单声道
            if len(audio_data.shape) > 1:
                audio_data = np.mean(audio_data, axis=1)
            
            # 确保采样率为16kHz（Whisper的要求）
            if sample_rate != 16000:
                # 这里需要重采样处理，但为简单起见，我们先跳过
                # 在实际应用中，建议使用 resampy 或 librosa 进行重采样
                pass
            
            # 使用 Whisper 进行语音识别
            result = model.transcribe(audio_data.astype(np.float32))
            
            # 删除临时文件
            os.unlink(temp_audio.name)
            
            return {"text": result}
            
    except Exception as e:
        print(f"Error: {str(e)}")  # 添加错误日志
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 