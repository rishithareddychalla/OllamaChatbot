import { create } from 'zustand';

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
  createdAt: number;
  tokens?: number;
  latency?: number;
}

export interface Chat {
  id: string;
  title: string;
  folderId?: string;
  createdAt: number;
  updatedAt: number;
  isPinned: number;
  systemPrompt?: string;
  model: string;
  temperature: number;
  topP: number;
}

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  messages: Message[];
  models: { name: string }[];
  isGenerating: boolean;
  setChats: (chats: Chat[]) => void;
  setActiveChatId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, update: Partial<Message>) => void;
  setModels: (models: { name: string }[]) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  createNewChat: () => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  pinChat: (id: string, isPinned: boolean) => Promise<void>;
  updateChatTitle: (id: string, title: string) => Promise<void>;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  messages: [],
  models: [],
  isGenerating: false,
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setChats: (chats) => set({ chats }),
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, update) => set((state) => ({
    messages: state.messages.map((m) => (m.id === id ? { ...m, ...update } : m))
  })),
  setModels: (models) => set({ models }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),

  fetchChats: async () => {
    try {
      const res = await fetch('http://127.0.0.1:3001/api/chat');
      const data = await res.json();
      set({ chats: data });
    } catch (e) {
      console.error(e);
    }
  },

  fetchMessages: async (chatId) => {
    try {
      const res = await fetch(`http://127.0.0.1:3001/api/chat/${chatId}/messages`);
      const data = await res.json();
      set({ messages: data, activeChatId: chatId });
    } catch (e) {
      console.error(e);
    }
  },

  createNewChat: async () => {
    try {
      const res = await fetch('http://127.0.0.1:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat', model: 'llama3' })
      });
      const data = await res.json();
      await get().fetchChats();
      set({ activeChatId: data.id, messages: [] });
    } catch (e) {
      console.error(e);
    }
  },

  deleteChat: async (id) => {
    try {
      await fetch(`http://127.0.0.1:3001/api/chat/${id}`, { method: 'DELETE' });
      await get().fetchChats();
      if (get().activeChatId === id) {
        set({ activeChatId: null, messages: [] });
      }
    } catch (e) {
      console.error(e);
    }
  },

  pinChat: async (id, isPinned) => {
    try {
      await fetch(`http://127.0.0.1:3001/api/chat/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned })
      });
      await get().fetchChats();
    } catch (e) {
      console.error(e);
    }
  },

  updateChatTitle: async (id, title) => {
    try {
      await fetch(`http://127.0.0.1:3001/api/chat/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      await get().fetchChats();
    } catch (e) {
      console.error(e);
    }
  }
}));
