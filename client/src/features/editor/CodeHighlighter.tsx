import React from 'react';

interface CodeHighlighterProps {
  text?: string;
  type: string;
}

export const CodeHighlighter: React.FC<CodeHighlighterProps> = ({
  text,
  type,
}) => {
  if (!text) return null;

  const lines = text.split('\n');

  const highlightLine = (line: string, type: string) => {
    if (type === 'md') {
      if (line.startsWith('# '))
        return <span className="text-catppuccin-mauve font-bold">{line}</span>;
      if (line.startsWith('## '))
        return <span className="text-catppuccin-blue font-bold">{line}</span>;
      if (line.startsWith('---'))
        return <span className="text-catppuccin-overlay0">{line}</span>;
      if (line.startsWith('- '))
        return (
          <span>
            <span className="text-catppuccin-red">- </span>
            {line.substring(2)}
          </span>
        );
      if (line.match(/^[a-z]+:/i)) {
        const parts = line.split(':');
        return (
          <span>
            <span className="text-catppuccin-teal">{parts[0]}:</span>
            {parts.slice(1).join(':')}
          </span>
        );
      }
      return <span className="text-catppuccin-text">{line}</span>;
    }

    if (type === 'json' || type === 'lua') {
      const parts = line.split(/([":,[\]{}])/);
      return parts.map((part, idx) => {
        if (part.match(/^[0-9]+$/))
          return (
            <span key={idx} className="text-catppuccin-peach">
              {part}
            </span>
          );
        if (part.match(/^".*"$/))
          return (
            <span key={idx} className="text-catppuccin-green">
              {part}
            </span>
          );
        if (part === 'true' || part === 'false')
          return (
            <span key={idx} className="text-catppuccin-red">
              {part}
            </span>
          );
        if (part.match(/[{}[\]]/))
          return (
            <span key={idx} className="text-catppuccin-yellow">
              {part}
            </span>
          );
        if (part === 'local' || part === 'return')
          return (
            <span key={idx} className="text-catppuccin-mauve italic">
              {part}
            </span>
          );
        return (
          <span key={idx} className="text-catppuccin-text">
            {part}
          </span>
        );
      });
    }

    return <span className="text-catppuccin-text">{line}</span>;
  };

  return (
    <div className="font-mono text-sm leading-6">
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="w-8 mr-4 text-catppuccin-overlay0 text-right select-none">
            {i + 1}
          </span>
          <span className="whitespace-pre-wrap break-all">
            {highlightLine(line, type)}
          </span>
        </div>
      ))}
      <div className="flex animate-pulse">
        <span className="w-8 mr-4 select-none"></span>
        <span className="w-2.5 h-5 bg-catppuccin-blue opacity-75"></span>
      </div>
    </div>
  );
};
