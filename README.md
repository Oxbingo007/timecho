# 时光回声 (Time Echo)

一个基于 AI 的生命故事记录与传记创作平台。

An AI-powered life story recording and biography creation platform.

## 功能特点 (Features)

- 🗣️ **智能访谈** - 通过 AI 引导的对话记录生命故事
- 📝 **传记创作** - 将访谈记录转化为精美的传记作品
- 🎙️ **语音输入** - 支持语音录入，让讲述更自然
- 💾 **本地存储** - 访谈记录安全存储在本地
- 🔄 **多模型支持** - 支持 GPT-3.5、DeepSeek、通义千问等多个 AI 模型
- 📤 **导出功能** - 支持导出访谈记录和传记内容

## 即将推出 (Coming Soon)

- 🖼️ **照片修复** - AI 修复老照片，创建动态影像效果
- 🎤 **AI 配音** - 生成自然的旁白配音，或克隆真实声音
- 🎬 **视频合成** - 将故事、照片、配音合成为完整的回忆视频

## 开始使用 (Getting Started)

1. 克隆项目 (Clone the repository)
```bash
git clone https://github.com/yourusername/timecho.git
```

2. 安装依赖 (Install dependencies)
```bash
cd timecho
npm install
```

3. 配置环境变量 (Configure environment variables)
创建 `.env.local` 文件并添加必要的 API 密钥：
```
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_api_key
NEXT_PUBLIC_QIANWEN_API_KEY=your_qianwen_api_key
```

4. 启动开发服务器 (Start the development server)
```bash
npm run dev
```

## 技术栈 (Tech Stack)

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- Radix UI
- Web Speech API

## 贡献 (Contributing)

欢迎提交 Pull Request 或创建 Issue。

Feel free to submit pull requests or create issues.

## 许可证 (License)

MIT 