import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
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

interface ApiChatMessage {
  user_prompt: string;
  ai_response: string;
}

const SYSTEM_MESSAGES: ChatMessage[] = [
  {
    role: 'system',
    text: 'NvChad Copilot v1.0 initialized for user: Guest...',
  },
  {
    role: 'ai',
    text: 'Hello Guest I am your portfolio assistant. Ask me about this portfolio.',
  },
];

export const ChatBuffer: React.FC = () => {
  const [input, setInput] = useState('');
  const [localHistory, setLocalHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const isGeneratingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  // ── Paginated fetch via TanStack Query ────────────────────────────────────
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['chat-messages'],
      queryFn: async ({ pageParam = 1 }) => {
        const result = await fetchMessages(pageParam as number, 10);
        return {
          messages: result as ApiChatMessage[],
          page: pageParam as number,
        };
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        if (lastPage.messages.length < 10) return undefined;
        return lastPage.page + 1;
      },
    });

  // Flatten paginated data into ChatMessage[] (oldest first)
  const fetchedHistory: ChatMessage[] = React.useMemo(() => {
    if (!data) return [];
    const allPages = [...data.pages].reverse();
    return allPages.flatMap((page) =>
      [...page.messages].reverse().flatMap((chat) => [
        { role: 'user' as const, text: chat.user_prompt },
        { role: 'ai' as const, text: chat.ai_response, thinking: [] },
      ])
    );
  }, [data]);

  // Combined history: system messages + fetched + local (in-progress)
  const history: ChatMessage[] = [
    ...SYSTEM_MESSAGES,
    ...fetchedHistory,
    ...localHistory,
  ];

  // ── Global SSE subscription (other clients) ───────────────────────────────
  useEffect(() => {
    let sseRef: EventSource | null = null;

    subscribeToGlobalStream((event: AiEvent) => {
      // Skip if this client is the one generating
      if (isGeneratingRef.current) return;

      setLocalHistory((prev) => {
        const newHistory = [...prev];
        let lastMsg = newHistory[newHistory.length - 1];

        if (
          !lastMsg ||
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
    }).then((sse) => {
      sseRef = sse;
    });

    return () => sseRef?.close();
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom || isFirstLoad.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        isFirstLoad.current = false;
      }
    }
  }, [history]);

  // ── Infinite scroll (load older messages on scroll to top) ────────────────
  const handleScroll = useCallback(
    async (e: React.UIEvent<HTMLDivElement>) => {
      if (
        e.currentTarget.scrollTop === 0 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        const prevScrollHeight = e.currentTarget.scrollHeight;
        await fetchNextPage();
        // Restore scroll position so the user doesn't jump to the top
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop =
              scrollRef.current.scrollHeight - prevScrollHeight;
          }
        });
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const prompt = input.trim();

    setLocalHistory((prev) => [
      ...prev,
      { role: 'user', text: prompt },
      { role: 'ai', text: '', thinking: [] },
    ]);
    setInput('');
    setLoading(true);
    isGeneratingRef.current = true;

    await streamGemini(prompt, (event: AiEvent) => {
      setLocalHistory((prev) => {
        const newHistory = [...prev];
        const lastMsg = newHistory[newHistory.length - 1];

        if (lastMsg?.role === 'ai') {
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
        isGeneratingRef.current = false;
      }
    });

    // Safety net: ensure flags are reset even if stream ends unexpectedly
    setLoading(false);
    isGeneratingRef.current = false;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full font-mono p-4">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-4 pb-4 custom-scrollbar pr-2"
      >
        {/* Load more indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-2 text-xs text-catppuccin-overlay0 italic">
            <Loader2 size={12} className="animate-spin mr-1" />
            Loading older messages...
          </div>
        )}

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
