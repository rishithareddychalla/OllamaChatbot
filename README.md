# LocalMind AI

## Project Description

LocalMind AI is a premium, privacy-first, offline AI assistant powered by local Large Language Models (LLMs). Built to provide a ChatGPT-like experience entirely on the user's local machine, the platform ensures that no sensitive data ever leaves the device. It features a highly responsive, modern user interface that supports real-time streamed responses, multimodal capabilities (processing both text and image inputs), and seamless chat history management. 

Users can interact with different local models, dynamically edit past prompts to fork conversations, and export their chats to Markdown or PDF—all while enjoying interactive micro-animations and a sleek, glassmorphic design.

### Technical Achievements
A major technical achievement of this project is the engineering of a reliable Server-Sent Events (SSE) streaming pipeline from the local Ollama engine, through the Express backend, to the React frontend while dynamically handling and persisting base64 image payloads for multimodal interactions.

---

## Tech Stack & Architecture

### Frontend (User Interface)
*   **Framework:** React (TypeScript via Vite)
*   **Styling:** Tailwind CSS (for rapid, responsive, and custom UI design)
*   **State Management:** Zustand (for lightweight, global chat state handling)
*   **Animations:** Framer Motion (used for fluid UI transitions and the interactive robot companion)
*   **Content Rendering:** React-Markdown (for formatting code blocks and AI responses) & Lucide React (for iconography)

### Backend (Server & API)
*   **Runtime:** Node.js
*   **Framework:** Express.js (Handles RESTful API endpoints and Server-Sent Events (SSE) for real-time text streaming)
*   **Database:** SQLite (Used for lightweight, local, and persistent storage of chat threads, messages, and model preferences)

### AI & Machine Learning Integration
*   **Engine:** Ollama (Runs the models efficiently on local hardware)
*   **Text Processing:** Llama 3 (Default local model for high-speed, accurate text generation)
*   **Vision/Multimodal:** LLaVA (Large Language-and-Vision Assistant for analyzing and reasoning about user-uploaded images)

---

## How to Run LocalMind AI Locally

### Step 1: Install Prerequisites
1. **Node.js**: Ensure you have Node.js installed (v18 or higher is recommended). You can download it from [nodejs.org](https://nodejs.org/).
2. **Ollama**: Download and install Ollama from [ollama.com](https://ollama.com/). This is required to run the AI models locally.

### Step 2: Download the AI Models
Once Ollama is installed, open your terminal or command prompt and pull the required models by running the following commands:
```bash
# Download the default text model
ollama run llama3

# Download the vision model (required for image processing)
ollama run llava
```
*(Note: These models are large and may take a few minutes to download depending on your internet connection. You can close these commands once they finish downloading).*

### Step 3: Start the Backend Server
Open a new terminal window, navigate to the root directory of the project, and start the Node.js backend:
```bash
# Navigate to the backend directory
cd backend

# Install the required dependencies
npm install

# Start the development server
npm run dev
```
*The backend server will start running, usually on `http://localhost:3001`.*

### Step 4: Start the Frontend Application
Open a second, separate terminal window, navigate to the root directory of the project, and start the React frontend:
```bash
# Navigate to the frontend directory
cd frontend

# Install the required dependencies
npm install

# Start the frontend development server
npm run dev
```

### Step 5: Access the Application
Once both the frontend and backend are running, open your web browser and navigate to the local URL provided by the frontend terminal (typically **`http://localhost:5173`**). 

You can now use LocalMind AI! Try typing a prompt, attaching an image, or testing the real-time chat editing features.

---

*100% Private. No telemetry. No cloud sync. Runs locally on your hardware.*
