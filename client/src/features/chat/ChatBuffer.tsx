import React, { useState, useEffect, useRef } from 'react';
import { USER_CONFIG } from '@/config/user';
import { callGemini } from '@/utils/gemini';
import { Bot } from 'lucide-react';

interface ChatMessage {
  role: 'system' | 'ai' | 'user';
  text: string;
}

export const ChatBuffer: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([
    {
      role: 'system',
      text: `NvChad Copilot v1.0 initialized for user: ${USER_CONFIG.name}...`,
    },
    {
      role: 'ai',
      text: `Hello ${USER_CONFIG.name}! I am your portfolio assistant. Ask me about the code, the projects, or general Vim commands.`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setHistory((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const reply = await callGemini(
      `You are a helpful AI assistant inside a developer's portfolio website that looks like Neovim. The user is named ${USER_CONFIG.name}. Be concise and technical. User asks: ${input}`
    );

    setHistory((prev) => [...prev, { role: 'ai', text: reply }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full font-mono p-4">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 custom-scrollbar pr-2">
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
                <div className="text-xs text-catppuccin-green font-bold mb-1 flex items-center gap-1">
                  <Bot size={12} /> GEMINI
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-catppuccin-mauve text-sm animate-pulse">
            Copilot is thinking...
          </div>
        )}
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
          placeholder="Ask Copilot..."
          className="flex-1 bg-transparent border-none outline-none text-catppuccin-text placeholder-catppuccin-overlay0 focus:ring-0"
        />
      </form>
    </div>
  );
};
