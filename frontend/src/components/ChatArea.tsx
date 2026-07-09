'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore, Message } from '@/store/chatStore';
import { Send, Bot, User, Download, FileText, StopCircle, Paperclip, Shield, Cpu, WifiOff, Zap, Mic, Volume2, X, ChevronDown, ChevronUp, Copy, Check, Edit2, RefreshCw, PanelLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from './ui/button';
import { motion } from 'framer-motion';
import { AdvancedRobot } from './AdvancedRobot';

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  
  // Heuristic: Fenced blocks either have a language or contain newlines.
  // Single backticks (inline) usually don't have newlines.
  const isBlock = match || String(children).includes('\n');
  
  if (isBlock) {
    const lang = match ? match[1] : 'text';
    const handleCopy = () => {
      navigator.clipboard.writeText(String(children));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="rounded-xl overflow-hidden my-4 border border-border bg-[#1e1e1e] shadow-lg">
        <div className="flex items-center justify-between px-4 py-2 bg-black/40 backdrop-blur-md text-xs font-mono border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 mr-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
            <span className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">{lang}</span>
          </div>
          <button onClick={handleCopy} className="hover:text-white text-gray-400 transition-colors flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md">
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus as any}
          language={lang}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }
  return (
    <code className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-md font-mono text-sm border border-border/50" {...props}>
      {children}
    </code>
  );
};

export function ChatArea() {
  const { chats, messages, activeChatId, isGenerating, setIsGenerating, addMessage, updateMessage, fetchChats, models, setModels, isSidebarOpen, toggleSidebar } = useChatStore();
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama3');
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAttachedFile(e.dataTransfer.files[0]);
    }
  };

  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window)) return alert('Speech recognition not supported in this browser.');
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((res: any) => res[0].transcript).join('');
      setInput(input ? input + ' ' + transcript : transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  useEffect(() => {
    fetch('http://127.0.0.1:3001/api/models')
      .then(res => res.json())
      .then(data => {
        if (data && data.models) setModels(data.models);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  useEffect(() => {
    const activeChat = chats.find(c => c.id === activeChatId);
    if (activeChat && activeChat.model) {
      setSelectedModel(activeChat.model);
    }
  }, [activeChatId, chats]);

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || !activeChatId || isGenerating) return;

    let finalMessageText = input;
    setInput('');
    setIsGenerating(true);
    
    let base64Images: string[] = [];
    if (attachedFile) {
      try {
        if (attachedFile.type.startsWith('image/')) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(attachedFile);
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
          });
          base64Images.push(base64);
          if (!finalMessageText.trim()) {
            finalMessageText = "What is in this image?";
          }
        } else if (attachedFile.name.endsWith('.docx')) {
          const mammoth = await import('mammoth');
          const arrayBuffer = await attachedFile.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          finalMessageText = `${finalMessageText}\n<file_attachment name="${attachedFile.name}">\n${result.value}\n</file_attachment>`;
        } else if (attachedFile.type === 'application/pdf' || attachedFile.name.endsWith('.pdf')) {
          alert('Sorry, PDF files are not fully supported yet. Please convert to a .docx or .txt file first.');
          setIsGenerating(false);
          return;
        } else {
          // Attempt to read as plain text
          const textContent = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsText(attachedFile);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
          finalMessageText = `${finalMessageText}\n<file_attachment name="${attachedFile.name}">\n${textContent}\n</file_attachment>`;
        }
      } catch (err) {
        console.error('Failed to read file:', err);
      }
    }
    
    setAttachedFile(null); // Clear the UI early

    let currentModel = selectedModel;
    if (base64Images.length > 0) {
      const isVisionModel = currentModel.toLowerCase().match(/llava|vision|pixtral|minicpm/);
      if (!isVisionModel) {
        const visionModel = models.find(m => m.name.toLowerCase().match(/llava|vision|pixtral|minicpm/));
        if (visionModel) {
          currentModel = visionModel.name;
          setSelectedModel(currentModel);
        } else {
          currentModel = 'llava';
          setSelectedModel(currentModel);
        }
      }
    }

    const userMsgId = Date.now().toString();
    addMessage({
      id: userMsgId,
      chatId: activeChatId,
      role: 'user',
      content: finalMessageText,
      images: base64Images.length > 0 ? base64Images : undefined,
      createdAt: Date.now()
    });

    const assistantMsgId = (Date.now() + 1).toString();
    addMessage({
      id: assistantMsgId,
      chatId: activeChatId,
      role: 'assistant',
      content: '',
      createdAt: Date.now()
    });

    const activeChat = chats.find(c => c.id === activeChatId);
    if (activeChat && activeChat.title === 'New Chat') {
      fetch(`http://127.0.0.1:3001/api/chat/${activeChatId}/title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalMessageText, model: currentModel })
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.title) {
          useChatStore.getState().updateChatTitle(activeChatId, data.title);
        }
      })
      .catch(console.error);
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`http://127.0.0.1:3001/api/chat/${activeChatId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: finalMessageText, images: base64Images.length > 0 ? base64Images : undefined, model: currentModel }),
        signal: abortControllerRef.current.signal
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // keep the last partial chunk in the buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                assistantText += data.token;
                updateMessage(assistantMsgId, { content: assistantText });
              }
              if (data.error) {
                if (data.error.includes('support images') || data.error.includes('vision model')) {
                  assistantText += `\n> **Error:** ${data.error}`;
                } else {
                  assistantText += `\n> **Error connecting to Ollama:** ${data.error}\n> \n> Please make sure Ollama is installed and running (\`ollama run llama3\`).`;
                }
                updateMessage(assistantMsgId, { content: assistantText });
                setIsGenerating(false);
              }
              if (data.done) {
                updateMessage(assistantMsgId, { tokens: data.tokens, latency: data.latency });
                fetchChats(); // Update updated_at
              }
            } catch (err) {
              console.error('Failed to parse stream chunk:', line);
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        console.error(e);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = async (messageId: string) => {
    if (!activeChatId || isGenerating) return;
    setIsGenerating(true);

    const userMessage = messages.slice().reverse().find(m => m.role === 'user');
    if (!userMessage) {
      setIsGenerating(false);
      return;
    }

    updateMessage(messageId, { content: '', tokens: undefined, latency: undefined });
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`http://127.0.0.1:3001/api/chat/${activeChatId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '', regenerateId: messageId, model: selectedModel }),
        signal: abortControllerRef.current.signal
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                assistantText += data.token;
                updateMessage(messageId, { content: assistantText });
              }
              if (data.done) {
                updateMessage(messageId, { tokens: data.tokens, latency: data.latency });
              }
            } catch (err) {}
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error(e);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeChatId || isGenerating) return;
    setIsGenerating(true);

    try {
      const res = await fetch(`http://127.0.0.1:3001/api/chat/${activeChatId}/edit-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, newContent })
      });
      if (!res.ok) throw new Error('Failed to edit');

      const msgRes = await fetch(`http://127.0.0.1:3001/api/chat/${activeChatId}/messages`);
      const updatedMessages = await msgRes.json();
      useChatStore.getState().setMessages(updatedMessages);

      const assistantMsgId = (Date.now() + 1).toString();
      useChatStore.getState().addMessage({
        id: assistantMsgId,
        chatId: activeChatId,
        role: 'assistant',
        content: '',
        createdAt: Date.now()
      });

      abortControllerRef.current = new AbortController();
      const response = await fetch(`http://127.0.0.1:3001/api/chat/${activeChatId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '', model: selectedModel }),
        signal: abortControllerRef.current.signal
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                assistantText += data.token;
                useChatStore.getState().updateMessage(assistantMsgId, { content: assistantText });
              }
              if (data.error) {
                if (data.error.includes('support images') || data.error.includes('vision model')) {
                   assistantText += `\n> **Error:** ${data.error}`;
                } else {
                   assistantText += `\n> **Error connecting to Ollama:** ${data.error}\n> \n> Please make sure Ollama is installed and running (\`ollama run llama3\`).`;
                }
                useChatStore.getState().updateMessage(assistantMsgId, { content: assistantText });
                useChatStore.getState().setIsGenerating(false);
              }
              if (data.done) {
                useChatStore.getState().updateMessage(assistantMsgId, { tokens: data.tokens, latency: data.latency });
              }
            } catch (err) {}
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error(e);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleExport = (format: string) => {
    if (!activeChatId) return;
    window.open(`http://127.0.0.1:3001/api/export/${activeChatId}/${format}`, '_blank');
  };

  if (!activeChatId) {
    return (
      <div className="flex-1 flex items-center justify-center chat-doodle-bg text-muted-foreground flex-col relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center gap-6 z-10 p-8 rounded-3xl bg-background/80 backdrop-blur-md border border-border shadow-2xl"
        >
          <AdvancedRobot state="idle" />
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">LocalMind AI</h1>
            <p className="text-lg text-muted-foreground font-medium">Your private, offline AI assistant.</p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-3 mt-2"
          >
            {[
              { icon: Shield, title: "100% Private", desc: "No data leaves your device" },
              { icon: Cpu, title: "Hardware Powered", desc: "Runs locally on your GPU" },
              { icon: WifiOff, title: "Works Offline", desc: "No internet required" },
              { icon: Zap, title: "Lightning Fast", desc: "Zero latency responses" }
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-secondary/30 hover:bg-secondary/60 border border-border/50 transition-all cursor-default">
                <div className="p-2 rounded-xl bg-background shadow-sm border border-border text-primary shrink-0">
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-foreground tracking-tight">{item.title}</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{item.desc}</span>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => useChatStore.getState().createNewChat()}
            className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium shadow-md flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Start a New Chat
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 flex flex-col h-full relative chat-doodle-bg"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl flex items-center justify-center pointer-events-none">
          <div className="bg-background px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-semibold text-lg animate-pulse">
            <Download className="w-6 h-6 text-primary" />
            Drop your file to attach
          </div>
        </div>
      )}
      {/* Top Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          {!isSidebarOpen && (
            <button onClick={toggleSidebar} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors rounded-md shrink-0" title="Open sidebar">
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-transparent text-foreground text-sm font-medium rounded-lg px-2 py-1 outline-none border border-transparent hover:bg-secondary transition-colors cursor-pointer"
          >
            {models.map(m => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
            {models.length === 0 && <option value="llama3">llama3</option>}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleExport('md')} title="Export Markdown">
            <FileText className="w-4 h-4 mr-2" /> Markdown
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleExport('pdf')} title="Export PDF">
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* Chat History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-2 relative">
          {messages.map((msg, idx) => (
            <MessageBubble 
              key={msg.id} 
              msg={msg} 
              isLast={idx === messages.length - 1} 
              isGenerating={isGenerating} 
              onRegenerate={handleRegenerate}
              onEdit={handleEditMessage}
            />
          ))}
          {messages.length === 0 && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               transition={{ duration: 0.5, ease: "easeOut" }}
               className="flex justify-center mt-20 md:mt-32 w-full"
             >
               <AdvancedRobot state="idle" />
             </motion.div>
          )}
          <div className="h-6 shrink-0" />
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-background/95 backdrop-blur-md pt-4 pb-6 px-4 md:px-8 z-20 border-t border-border/50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto relative bg-secondary rounded-3xl shadow-sm focus-within:ring-1 focus-within:ring-border transition-all flex items-end border border-border">
          
          {attachedFile && (
            <div className="absolute -top-16 left-4 bg-background/90 backdrop-blur-md p-2 rounded-xl border border-border flex items-center gap-3 shadow-lg z-30">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                {attachedFile.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(attachedFile)} alt="thumb" className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col text-sm max-w-[150px]">
                <span className="truncate font-medium">{attachedFile.name}</span>
                <span className="text-[10px] text-muted-foreground">{(attachedFile.size / 1024).toFixed(1)} KB</span>
              </div>
              <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <label className="mb-2 ml-2 cursor-pointer flex items-center justify-center rounded-full w-10 h-10 shrink-0 text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors">
            <Paperclip className="w-5 h-5" />
            <input type="file" className="hidden" title="Attach file" multiple onChange={(e) => { if (e.target.files) setAttachedFile(e.target.files[0]) }} />
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (items) {
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                      e.preventDefault();
                      setAttachedFile(file);
                      return; // Exit once we attach the image
                    }
                  }
                }
              }
            }}
            placeholder="Message LocalMind AI..."
            className="flex-1 bg-transparent text-foreground py-4 px-2 outline-none resize-none min-h-[56px] max-h-[200px]"
            rows={1}
            style={{ fieldSizing: 'content' } as any}
          />
          <div className="mb-2 mr-2 flex items-center gap-1 shrink-0">
            <button 
              onClick={handleMicClick}
              className={`flex items-center justify-center rounded-full w-10 h-10 transition-colors ${isRecording ? 'text-destructive bg-destructive/10 animate-pulse' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
              title="Speech to Text"
            >
              <Mic className="w-5 h-5" />
            </button>
            {isGenerating ? (
              <Button onClick={handleStop} size="icon" variant="destructive" className="rounded-full w-10 h-10 shadow-sm transition-transform">
                <StopCircle className="w-5 h-5" />
              </Button>
            ) : (
            <button 
              onClick={handleSend} 
              disabled={(!input.trim() && !attachedFile) || isGenerating} 
              className="flex items-center justify-center rounded-full w-10 h-10 shadow-sm transition-transform disabled:opacity-30 disabled:bg-transparent disabled:text-muted-foreground ml-1"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
            )}
          </div>
        </div>
        <div className="text-center text-[11px] text-muted-foreground mt-3 font-medium">
          LocalMind AI can make mistakes. Check important info.
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isLast, isGenerating, onRegenerate, onEdit }: any) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTTS = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (!isPlaying) {
        const utterance = new SpeechSynthesisUtterance(msg.content);
        utterance.onend = () => setIsPlaying(false);
        setIsPlaying(true);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlaying(false);
      }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(msg.content);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    if (editContent.trim() && editContent !== msg.content) {
      onEdit(msg.id, editContent);
    }
  };

  const contentToRender = msg.content + (isLast && isGenerating && !isUser ? ' ▋' : '');

  // Extract file attachments
  let displayContent = contentToRender;
  const fileAttachments: string[] = [];
  const fileRegex = /<file_attachment name="([^"]+)">[\s\S]*?<\/file_attachment>/g;
  let match;
  while ((match = fileRegex.exec(contentToRender)) !== null) {
    fileAttachments.push(match[1]);
  }
  displayContent = displayContent.replace(fileRegex, '').trim();

  return (
    <div className={`flex w-full group ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
        {isUser && (
          <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-primary/10">
            <User className="w-5 h-5 text-primary" />
          </div>
        )}
        {!isUser && (
          <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center border border-border bg-background">
            <Bot className="w-5 h-5 text-foreground" />
          </div>
        )}
        
        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'} min-w-0 w-full`}>
          <div className={`px-5 py-3 text-[15px] leading-relaxed shadow-sm w-full ${isUser ? 'bg-secondary text-secondary-foreground rounded-3xl rounded-tr-sm' : 'bg-card border border-border text-card-foreground rounded-3xl rounded-tl-sm'}`}>
            {fileAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {fileAttachments.map((fileName, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-background/50 border border-border/50 rounded-xl px-3 py-2 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium truncate max-w-[150px]">{fileName}</span>
                  </div>
                ))}
              </div>
            )}
            {msg.images && Array.isArray(msg.images) && msg.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {msg.images.map((imgBase64: string, idx: number) => {
                  const src = imgBase64.startsWith('data:image') ? imgBase64 : `data:image/jpeg;base64,${imgBase64}`;
                  return (
                    <img 
                      key={idx} 
                      src={src} 
                      alt="Uploaded image" 
                      className="max-w-[250px] max-h-[250px] rounded-xl object-contain border border-border/50 bg-black/10"
                    />
                  );
                })}
              </div>
            )}
            {isEditing ? (
              <div className="flex flex-col gap-2 w-full mt-2">
                <textarea 
                  value={editContent} 
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-background text-foreground border border-border/50 rounded-xl p-3 outline-none resize-y min-h-[100px] text-sm focus:ring-1 focus:ring-primary/50 transition-shadow"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-1">
                  <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 text-xs font-medium rounded-lg hover:bg-background/80 transition-colors border border-border/50">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">Save & Submit</button>
                </div>
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-p:m-0 prose-p:mb-3 last:prose-p:mb-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
                  {displayContent}
                </ReactMarkdown>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity px-2 mt-1">
            {!isUser && (
              <>
                <button onClick={handleTTS} className={`p-1.5 transition-colors rounded-md ${isPlaying ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`} title="Read Aloud">
                  <Volume2 className="w-4 h-4" />
                </button>
                <button onClick={handleCopy} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors rounded-md" title="Copy">
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </button>
                {isLast && (
                  <button onClick={() => onRegenerate(msg.id)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors rounded-md" title="Regenerate">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            {isUser && (
              <button onClick={handleEdit} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors rounded-md" title="Edit prompt">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {Boolean(msg.tokens) && !isUser && (
            <div className="text-[11px] text-muted-foreground flex gap-3 font-medium self-start px-2">
               <span>{msg.tokens} tokens</span>
               <span>{(msg.latency! / 1000).toFixed(2)}s</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
