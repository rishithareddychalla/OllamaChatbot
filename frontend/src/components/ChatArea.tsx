'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore, Message } from '@/store/chatStore';
import { Send, Bot, User, Download, FileText, StopCircle, Check, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from './ui/button';
import { motion } from 'framer-motion';

export function ChatArea() {
  const { chats, messages, activeChatId, isGenerating, setIsGenerating, addMessage, updateMessage, fetchChats, models, setModels } = useChatStore();
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama3');
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const handleSend = async () => {
    if (!input.trim() || !activeChatId || isGenerating) return;

    const messageText = input;
    setInput('');
    setIsGenerating(true);

    const userMsgId = Date.now().toString();
    addMessage({
      id: userMsgId,
      chatId: activeChatId,
      role: 'user',
      content: messageText,
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
      const newTitle = messageText.slice(0, 30) + (messageText.length > 30 ? '...' : '');
      useChatStore.getState().updateChatTitle(activeChatId, newTitle);
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`http://127.0.0.1:3001/api/chat/${activeChatId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
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
                assistantText += `\n> **Error connecting to Ollama:** ${data.error}\n> \n> Please make sure Ollama is installed and running (\`ollama run llama3\`).`;
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
        body: JSON.stringify({ message: '', regenerateId: messageId }),
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
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center shadow-inner relative"
          >
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
            <Bot className="w-12 h-12 text-primary drop-shadow-md" />
          </motion.div>
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">LocalMind AI</h1>
            <p className="text-lg text-muted-foreground font-medium">Your private, offline AI assistant.</p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="pt-4 flex items-center gap-3 text-sm"
          >
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Secure</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Private</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Offline</span>
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
    <div className="flex-1 flex flex-col h-full relative chat-doodle-bg">
      {/* Top Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-4">
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth pb-40">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          {messages.map((msg, idx) => (
            <MessageBubble 
              key={msg.id} 
              msg={msg} 
              isLast={idx === messages.length - 1} 
              isGenerating={isGenerating} 
              onRegenerate={handleRegenerate}
            />
          ))}
          {messages.length === 0 && (
             <div className="text-center mt-20 text-muted-foreground bg-background/80 backdrop-blur-sm inline-block mx-auto p-6 rounded-2xl border border-border shadow-sm">
               <Bot className="w-12 h-12 mx-auto mb-4 opacity-50 text-primary" />
               <h2 className="text-xl font-medium text-foreground mb-2">How can I help you today?</h2>
               <p className="text-sm">LocalMind AI is ready. Chat securely using your local hardware.</p>
             </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-transparent pt-4 pb-6 px-4 md:px-8 z-20">
        <div className="max-w-3xl mx-auto relative bg-secondary rounded-3xl shadow-sm focus-within:ring-1 focus-within:ring-border transition-all flex items-end border border-border">
          <label className="mb-2 ml-2 cursor-pointer flex items-center justify-center rounded-full w-10 h-10 shrink-0 text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors">
            <Paperclip className="w-5 h-5" />
            <input type="file" className="hidden" title="Attach file" multiple />
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
            placeholder="Message LocalMind AI..."
            className="flex-1 bg-transparent text-foreground py-4 px-2 outline-none resize-none min-h-[56px] max-h-[200px]"
            rows={1}
            style={{ fieldSizing: 'content' } as any}
          />
          <div className="mb-2 mr-2 flex items-center gap-2 shrink-0">
            {isGenerating ? (
              <Button onClick={handleStop} size="icon" variant="destructive" className="rounded-full w-10 h-10 shadow-sm transition-transform">
                <StopCircle className="w-5 h-5" />
              </Button>
            ) : (
              <Button onClick={handleSend} disabled={!input.trim()} size="icon" className="rounded-full w-10 h-10 shadow-sm transition-transform disabled:opacity-30 disabled:bg-transparent disabled:text-muted-foreground">
                <Send className="w-4 h-4 ml-0.5" />
              </Button>
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

import { Copy, RefreshCw, Edit2 } from 'lucide-react';

function MessageBubble({ msg, isLast, isGenerating, onCopy, onRegenerate }: any) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    // Put the message text back into the input for the user to edit and resend
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      nativeInputValueSetter?.call(textarea, msg.content);
      const event = new Event('input', { bubbles: true});
      textarea.dispatchEvent(event);
      textarea.focus();
    }
  };

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
        
        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'} min-w-0`}>
          <div className={`px-5 py-3 text-[15px] leading-relaxed shadow-sm ${isUser ? 'bg-secondary text-secondary-foreground rounded-3xl rounded-tr-sm' : 'bg-card border border-border text-card-foreground rounded-3xl rounded-tl-sm'}`}>
            <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-p:m-0 prose-p:mb-3 last:prose-p:mb-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="rounded-xl overflow-hidden my-4 border border-border bg-[#1e1e1e]">
                        <div className="flex items-center justify-between px-4 py-2 bg-secondary text-xs text-secondary-foreground border-b border-border font-medium">
                          <span>{match[1]}</span>
                          <button onClick={() => navigator.clipboard.writeText(String(children))} className="hover:text-primary transition-colors flex items-center gap-1">
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus as any}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-md font-mono text-sm border border-border/50" {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {msg.content || (isLast && isGenerating ? '...' : '')}
              </ReactMarkdown>
            </div>
            {isLast && isGenerating && !isUser && (
              <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
            )}
          </div>
          
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity px-2">
            {!isUser && (
              <>
                <button onClick={handleCopy} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md" title="Copy">
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </button>
                {isLast && (
                  <button onClick={() => onRegenerate(msg.id)} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md" title="Regenerate">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            {isUser && (
              <button onClick={handleEdit} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md" title="Edit prompt">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {msg.tokens && !isUser && (
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
