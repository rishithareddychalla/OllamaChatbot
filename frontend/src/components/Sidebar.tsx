'use client';
import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { Plus, MessageSquare, Pin, Trash2, Settings, Download, Moon, Sun, Bot, Pencil, Check, X, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar() {
  const { chats, activeChatId, fetchChats, createNewChat, deleteChat, pinChat, updateChatTitle, setActiveChatId, fetchMessages, isSidebarOpen, toggleSidebar } = useChatStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    fetchChats();
    document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const safeChats = Array.isArray(chats) ? chats : [];
  const filteredChats = safeChats.filter(c => (c.title || '').toLowerCase().includes((searchTerm || '').toLowerCase()));
  const pinnedChats = filteredChats.filter(c => c.isPinned);
  const unpinnedChats = filteredChats.filter(c => !c.isPinned);

  return (
    <AnimatePresence initial={false}>
      {isSidebarOpen && (
        <motion.div 
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 288, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="h-full shrink-0 border-r border-border bg-sidebar overflow-hidden"
        >
          <div className="w-72 h-full flex flex-col">
            <div className="p-4 border-b border-border flex flex-col gap-4 bg-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-lg text-foreground">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Bot className="w-5 h-5" />
                  </div>
                  LocalMind AI
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full hover:bg-background/50">
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={toggleSidebar} className="rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground">
                    <PanelLeftClose className="w-4 h-4" />
                  </Button>
                </div>
              </div>
        <Button onClick={createNewChat} className="w-full gap-2 rounded-full font-medium shadow-sm">
          <Plus className="w-4 h-4" /> New Chat
        </Button>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search chats..." 
            className="w-full bg-background text-foreground placeholder:text-muted-foreground text-sm rounded-full px-4 py-2 outline-none border border-border focus:border-primary transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {pinnedChats.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-3 uppercase tracking-wider">Pinned</div>
            {pinnedChats.map(chat => (
              <ChatListItem key={chat.id} chat={chat} isActive={activeChatId === chat.id} onSelect={() => fetchMessages(chat.id)} onPin={() => pinChat(chat.id, false)} onDelete={() => deleteChat(chat.id)} onRename={(id: string, title: string) => updateChatTitle(id, title)} />
            ))}
          </div>
        )}

        <div className="text-xs font-semibold text-muted-foreground mb-2 px-3 uppercase tracking-wider">Recent</div>
        {unpinnedChats.map(chat => (
          <ChatListItem key={chat.id} chat={chat} isActive={activeChatId === chat.id} onSelect={() => fetchMessages(chat.id)} onPin={() => pinChat(chat.id, true)} onDelete={() => deleteChat(chat.id)} onRename={(id: string, title: string) => updateChatTitle(id, title)} />
        ))}
      </div>
    </div>
  </motion.div>
)}
</AnimatePresence>
  );
}

function ChatListItem({ chat, isActive, onSelect, onPin, onDelete, onRename }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== chat.title) {
      onRename(chat.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditTitle(chat.title);
      setIsEditing(false);
    }
  };

  return (
    <div 
      className={cn(
        "group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all mb-1 border border-transparent",
        isActive ? "bg-background shadow-sm border-border" : "hover:bg-background/50 text-muted-foreground"
      )}
      onClick={() => !isEditing && onSelect()}
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        <MessageSquare className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-foreground p-0 m-0 w-full"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={cn("truncate text-sm", isActive ? "font-medium text-foreground" : "")}>{chat.title}</span>
        )}
      </div>
      {!isEditing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 bg-background/80 md:bg-transparent pl-1 rounded-md">
          <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1 hover:text-primary transition-colors" title="Rename">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onPin(); }} className="p-1 hover:text-primary transition-colors" title={chat.isPinned ? "Unpin" : "Pin"}>
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:text-destructive transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

