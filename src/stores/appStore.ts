import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createPlatformAdapter } from '../adapters';

interface AISource {
  id: string;
  name: string;
  type: 'openai' | 'claude' | 'gemini' | 'volcengine' | 'volcengine-dream';
  apiKey: string;
  baseUrl?: string;
  enabled: boolean;
  models: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sourceId?: string;
}

interface AppState {
  // AI Sources
  aiSources: AISource[];
  currentSourceId: string | null;
  
  // Chat
  chatMessages: ChatMessage[];
  isStreaming: boolean;
  
  // UI State
  activeTab: string;
  settingsOpen: boolean;
  
  // Platform
  platform: ReturnType<typeof createPlatformAdapter>;
  
  // Actions
  addAISource: (source: Omit<AISource, 'id'>) => void;
  updateAISource: (id: string, updates: Partial<AISource>) => void;
  removeAISource: (id: string) => void;
  setCurrentSource: (id: string) => void;
  
  addChatMessage: (message: Omit<ChatMessage, 'id'>) => void;
  clearChatMessages: () => void;
  setStreaming: (streaming: boolean) => void;
  
  setActiveTab: (tab: string) => void;
  toggleSettings: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        aiSources: [],
        currentSourceId: null,
        chatMessages: [],
        isStreaming: false,
        activeTab: 'chat',
        settingsOpen: false,
        platform: createPlatformAdapter(),
        
        // Actions
        addAISource: (source) => {
          const newSource: AISource = {
            ...source,
            id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          };
          set((state) => ({
            aiSources: [...state.aiSources, newSource],
            currentSourceId: state.currentSourceId || newSource.id,
          }));
        },
        
        updateAISource: (id, updates) => {
          set((state) => ({
            aiSources: state.aiSources.map((source) =>
              source.id === id ? { ...source, ...updates } : source
            ),
          }));
        },
        
        removeAISource: (id) => {
          set((state) => ({
            aiSources: state.aiSources.filter((source) => source.id !== id),
            currentSourceId: state.currentSourceId === id ? null : state.currentSourceId,
          }));
        },
        
        setCurrentSource: (id) => {
          set({ currentSourceId: id });
        },
        
        addChatMessage: (message) => {
          const newMessage: ChatMessage = {
            ...message,
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          };
          set((state) => ({
            chatMessages: [...state.chatMessages, newMessage],
          }));
        },
        
        clearChatMessages: () => {
          set({ chatMessages: [] });
        },
        
        setStreaming: (streaming) => {
          set({ isStreaming: streaming });
        },
        
        setActiveTab: (tab) => {
          set({ activeTab: tab });
        },
        
        toggleSettings: () => {
          set((state) => ({ settingsOpen: !state.settingsOpen }));
        },
      }),
      {
        name: 'ai-automation-storage',
        partialize: (state) => ({
          aiSources: state.aiSources,
          currentSourceId: state.currentSourceId,
          activeTab: state.activeTab,
        }),
      }
    ),
    { name: 'ai-automation-store' }
  )
);