import React, { useState, useEffect, useRef } from 'react';
import {
  streamGemini,
  fetchMessages,
  subscribeToGlobalStream,
  AiEvent,
} from '@/utils/gemini';
import { Bot, ChevronRight, Loader2 } from 'lucide-react';

interface ChatMessage {
  role: 'system' | 'ai' | 'user';
  text: string;
  thinking?: string[];
}

export const ChatBuffer: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([
    {
      role: 'system',
      text: `NvChad Copilot v1.0 initialized for user: Guest...`,
    },
    {
      role: 'ai',
      text: `Hello Guest I am your portfolio assistant. Ask me about this portfolio.`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  // Initial fetch
  useEffect(() => {
    const loadInitialChats = async () => {
      try {
        const data = await fetchMessages(1, 10);
        if (data.length < 10) setHasMore(false);

        // Reverse because backend sends ORDER BY created_at DESC
        const formatted: ChatMessage[] = data.reverse().flatMap((chat: any) => [
          { role: 'user', text: chat.user_prompt },
          { role: 'ai', text: chat.ai_response, thinking: [] },
        ]);

        setHistory((prev) => [...prev, ...formatted]);
        isFirstLoad.current = false;
      } catch (e) {
        console.error('Failed to load initial chats', e);
      }
    };
    loadInitialChats();
  }, []);

  // Global Stream Subscription
  useEffect(() => {
    const sse = subscribeToGlobalStream((event) => {
      // If we are currently loading, our local stream is handling it
      // So we only append global events if we are NOT loading (someone else triggered it)
      if (loading) return;

      setHistory((prev) => {
        const newHistory = [...prev];
        let lastMsg = newHistory[newHistory.length - 1];

        // If the last message is not an active AI message, create one
        if (
          lastMsg.role !== 'ai' ||
          (lastMsg.text.length > 0 && event.type === 'Thinking')
        ) {
          newHistory.push({ role: 'ai', text: '', thinking: [] });
          lastMsg = newHistory[newHistory.length - 1];
        }

        if (event.type === 'Thinking') {
          lastMsg.thinking = [...(lastMsg.thinking || []), event.content];
        } else if (event.type === 'Response') {
          lastMsg.text = event.content;
        } else if (event.type === 'Error') {
          lastMsg.text = event.content;
        }

        return newHistory;
      });
    });

    return () => sse.close();
  }, [loading]);

  // Auto-scroll on new message
  useEffect(() => {
    // Only scroll to bottom if we are relatively close to it, or on first load
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom || isFirstLoad.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [history]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore) {
      const nextPage = page + 1;
      try {
        const data = await fetchMessages(nextPage, 10);
        if (data.length < 10) setHasMore(false);
        if (data.length > 0) {
          const formatted: ChatMessage[] = data
            .reverse()
            .flatMap((chat: any) => [
              { role: 'user', text: chat.user_prompt },
              { role: 'ai', text: chat.ai_response, thinking: [] },
            ]);

          setHistory((prev) => {
            // Keep the system init message at index 0-1
            const base = prev.slice(0, 2);
            const rest = prev.slice(2);
            return [...base, ...formatted, ...rest];
          });
          setPage(nextPage);
        }
      } catch (e) {
        console.error('Failed to fetch more messages', e);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    const prompt = `${input}`;

    setHistory((prev) => [
      ...prev,
      userMsg,
      { role: 'ai', text: '', thinking: [] },
    ]);
    setInput('');
    setLoading(true);

    await streamGemini(prompt, (event: AiEvent) => {
      setHistory((prev) => {
        const newHistory = [...prev];
        const lastMsg = newHistory[newHistory.length - 1];

        if (lastMsg.role === 'ai') {
          if (event.type === 'Thinking') {
            lastMsg.thinking = [...(lastMsg.thinking || []), event.content];
          } else if (event.type === 'Response') {
            lastMsg.text = event.content;
          } else if (event.type === 'Error') {
            lastMsg.text = event.content;
          }
        }
        return newHistory;
      });

      if (event.type === 'Response' || event.type === 'Error') {
        setLoading(false);
      }
    });
  };

  return (
    <div className="flex flex-col h-full font-mono p-4">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-4 pb-4 custom-scrollbar pr-2"
      >
        {history.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-catppuccin-surface0 text-catppuccin-text border border-catppuccin-surface1'
                  : msg.role === 'system'
                    ? 'text-catppuccin-overlay0 italic'
                    : 'text-catppuccin-green border-l-2 border-catppuccin-green bg-catppuccin-crust/50 pl-3'
              }`}
            >
              {msg.role === 'ai' && (
                <div className="text-xs text-catppuccin-green font-bold mb-2 flex items-center gap-1">
                  <Bot size={12} /> GEMINI
                </div>
              )}

              {msg.thinking && msg.thinking.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.thinking.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start text-xs text-catppuccin-overlay1 italic"
                    >
                      <ChevronRight
                        size={12}
                        className="mt-[2px] mr-1 shrink-0"
                      />
                      <span>{step}</span>
                    </div>
                  ))}
                  {loading && i === history.length - 1 && (
                    <div className="flex items-center text-xs text-catppuccin-mauve italic mt-1 ml-4">
                      <Loader2 size={10} className="animate-spin mr-1" />
                      <span>thinking...</span>
                    </div>
                  )}
                </div>
              )}

              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-2 border-t border-catppuccin-surface1 pt-3 flex gap-2 items-center flex-shrink-0"
      >
        <span className="text-catppuccin-blue font-bold">{'>'}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder={loading ? 'Copilot is thinking...' : 'Ask Copilot...'}
          className="flex-1 bg-transparent border-none outline-none text-catppuccin-text placeholder-catppuccin-overlay0 focus:ring-0 disabled:opacity-50"
        />
      </form>
    </div>
  );
};
