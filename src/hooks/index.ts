import { useAppStore } from '../stores/appStore';

export const useAISources = () => {
  const {
    aiSources,
    currentSourceId,
    addAISource,
    updateAISource,
    removeAISource,
    setCurrentSource,
  } = useAppStore();

  const currentSource = aiSources.find((source) => source.id === currentSourceId);

  return {
    aiSources,
    currentSource,
    currentSourceId,
    addAISource,
    updateAISource,
    removeAISource,
    setCurrentSource,
  };
};

export const useChat = () => {
  const {
    chatMessages,
    isStreaming,
    addChatMessage,
    clearChatMessages,
    setStreaming,
    currentSourceId,
  } = useAppStore();

  const sendMessage = async (content: string) => {
    if (!currentSourceId) return;

    setStreaming(true);
    addChatMessage({
      role: 'user',
      content,
      timestamp: new Date(),
      sourceId: currentSourceId,
    });

    try {
      // TODO: Implement actual API call
      const response = 'This is a mock response';
      addChatMessage({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        sourceId: currentSourceId,
      });
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setStreaming(false);
    }
  };

  return {
    messages: chatMessages,
    isStreaming,
    sendMessage,
    clearMessages: clearChatMessages,
  };
};

export const useUI = () => {
  const { activeTab, settingsOpen, setActiveTab, toggleSettings, platform } =
    useAppStore();

  return {
    activeTab,
    settingsOpen,
    setActiveTab,
    toggleSettings,
    platform,
  };
};