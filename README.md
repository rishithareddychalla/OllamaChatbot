<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/monitor.svg" width="80" height="80" alt="LocalMind AI Logo" />
  <h1>LocalMind AI</h1>
  <p>Production-grade local AI chat application powered by Ollama</p>
</div>

---

## 🌟 Overview

LocalMind AI is a premium, desktop-grade web workspace that brings the power of commercial AI tools like ChatGPT and LM Studio to your local machine. It connects seamlessly with Ollama, enabling private, fast, and secure conversations using models like Llama 3, DeepSeek, and Mistral without sending data to the cloud.

### 🚀 Key Features

*   **⚡ Streaming Responses:** Ultra-fast token streaming directly from Ollama.
*   **📝 Professional Markdown:** Full support for Markdown, tables, and syntax-highlighted code blocks.
*   **📊 Performance Metrics:** Real-time token counting and latency tracking (t/s).
*   **🗂️ Advanced Chat Management:** Pinned chats, full search, edit, and deletion capabilities.
*   **💾 Local Storage:** Zero-dependency SQLite backend ensuring your data never leaves your device.
*   **📤 Export Options:** Export conversations to PDF, Markdown, or JSON.
*   **🎨 Premium UI/UX:** Built with Next.js App Router, TailwindCSS, Shadcn UI styling, and Glassmorphism. Dark/Light themes supported.
*   **🛑 Execution Control:** Stop generation instantly or regenerate responses on the fly.
*   **🎛️ Model & Parameter Selection:** Switch between installed models instantly and fine-tune output dynamically.

## 🛠️ Tech Stack

*   **Frontend:** Next.js 15, TypeScript, TailwindCSS, Zustand
*   **Backend:** Node.js, Express, Better-SQLite3, PDFKit
*   **AI Engine:** Ollama API Integration

---

## 💻 Setup Instructions

LocalMind AI operates as a unified monorepo.

### Prerequisites

1.  **Node.js** (v18 or higher)
2.  **Ollama** installed on your system ([Download Ollama](https://ollama.ai/))

### 1. Start Ollama and Pull a Model

Make sure Ollama is running in the background.

```bash
ollama run llama3
```

### 2. Install Dependencies

In the root of the project, run:

```bash
npm install
```
*(This automatically installs dependencies for both backend and frontend using npm workspaces)*

### 3. Run the Application

Start both the Node.js backend and Next.js frontend concurrently:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 🔒 Privacy & Security

LocalMind AI runs entirely locally. The SQLite database is created in the `/data` directory at the root of the project. No telemetry, no cloud sync, and 100% privacy.

---

*Designed and developed by your Principal AI Engineering team.*
