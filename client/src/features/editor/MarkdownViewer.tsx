import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeHighlighter } from './CodeHighlighter';

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-catppuccin max-w-none w-full pb-20">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : 'text';

            return !inline ? (
              <div className="not-prose my-4 rounded-lg overflow-hidden border border-catppuccin-surface1">
                <div className="bg-catppuccin-mantle px-4 py-2 text-xs text-catppuccin-overlay0 border-b border-catppuccin-surface1">
                  {lang}
                </div>
                <div className="p-4 bg-catppuccin-base overflow-x-auto">
                   <CodeHighlighter text={String(children).replace(/\n$/, '')} type={lang} />
                </div>
              </div>
            ) : (
              <code className="bg-catppuccin-surface0 text-catppuccin-pink px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          img({ node, ...props }: any) {
            return (
              <img
                className="max-w-full h-auto rounded-lg border border-catppuccin-surface0 shadow-md my-4"
                {...props}
                alt={props.alt || 'Markdown Image'}
              />
            );
          },
          a({ node, ...props }: any) {
            return (
              <a
                className="text-catppuccin-blue hover:text-catppuccin-sapphire underline decoration-catppuccin-surface2 underline-offset-4 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};