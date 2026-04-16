import React, { useState, useEffect, useRef } from 'react';

interface TerminalLine {
  type: 'system' | 'input' | 'output';
  text: string;
}

// Simulated terminal buffer component with basic command handling
export const TerminalBuffer: React.FC = () => {
  const [history, setHistory] = useState<TerminalLine[]>([
    { type: 'system', text: 'Welcome to NvChad Terminal' },
    { type: 'system', text: 'Type "help" to see available commands.' },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleCommand = (cmd: string) => {
    const args = cmd.trim().split(' ');
    const command = args[0].toLowerCase();

    let response = '';

    switch (command) {
      case 'help':
        response =
          'Available commands:\n  help    - Show this message\n  whoami  - Print effective userid\n  ls      - List directory contents\n  clear   - Clear terminal output\n  nmap    - Network exploration tool and security / port scanner';
        break;
      case 'whoami':
        response = 'guest';
        break;
      case 'ls':
        response =
          'content/  projects/  blog/  cybersecurity/  config/  copilot.chat';
        break;
      case 'clear':
        setHistory([]);
        setInput('');
        return;
      case 'nmap':
        if (args.length > 1) {
          response = `Starting Nmap 7.93 ( https://nmap.org )\nNmap scan report for ${args[1]}\nHost is up (0.012s latency).\nNot shown: 998 closed tcp ports (conn-refused)\nPORT   STATE SERVICE\n22/tcp open  ssh\n80/tcp open  http\n\nNmap done: 1 IP address (1 host up) scanned in 1.42 seconds`;
        } else {
          response =
            'nmap: Missing target specification.\nUsage: nmap [Scan Type(s)] [Options] {target specification}';
        }
        break;
      case '':
        break;
      default:
        response = `bash: ${command}: command not found`;
    }

    setHistory((prev) => [
      ...prev,
      { type: 'input' as const, text: `guest@portfolio:~$ ${cmd}` },
      ...(response ? [{ type: 'output' as const, text: response }] : []),
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input && input.trim() === '') {
      setHistory((prev) => [
        ...prev,
        { type: 'input' as const, text: `guest@portfolio:~$ ` },
      ]);
      return;
    }
    handleCommand(input);
    setInput('');
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div className="flex flex-col h-full font-mono p-4 text-sm bg-catppuccin-base text-catppuccin-text">
      <div className="flex-1 overflow-y-auto space-y-1 pb-4 custom-scrollbar pr-2">
        {history.map((line, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap ${line.type === 'input' ? 'text-catppuccin-green font-bold' : 'text-catppuccin-subtext0'}`}
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-2 flex gap-2 items-center flex-shrink-0"
      >
        <span className="text-catppuccin-green font-bold">
          guest@portfolio:~$
        </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-catppuccin-text focus:ring-0"
          autoFocus
        />
      </form>
    </div>
  );
};
