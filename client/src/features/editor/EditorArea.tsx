import React, { Suspense } from 'react';
import { useFileSystem } from '@/context/FileSystemContext';
import { Terminal } from 'lucide-react';
import { CodeHighlighter } from './CodeHighlighter';
import { MarkdownViewer } from './MarkdownViewer';

// Lazy load feature buffers for performance
const ChatBuffer = React.lazy(() =>
  import('@/features/chat/ChatBuffer').then((module) => ({
    default: module.ChatBuffer,
  }))
);
const TerminalBuffer = React.lazy(() =>
  import('@/features/terminal/TerminalBuffer').then((module) => ({
    default: module.TerminalBuffer,
  }))
);

export const EditorArea: React.FC = () => {
  const { files, activeFileId, getFileType } = useFileSystem();

  return (
    <div className="flex-1 flex flex-col bg-catppuccin-base relative w-full h-full min-w-0">
      {/* Breadcrumbs / WinBar */}
      {activeFileId && files[activeFileId] && (
        <div className="h-8 flex items-center justify-between px-4 text-xs text-catppuccin-overlay0 border-b border-catppuccin-surface1/50 bg-catppuccin-base flex-shrink-0">
          <div className="flex items-center">
            {files[activeFileId].type === 'terminal'
              ? 'cybersecurity > terminal'
              : `portfolio > ${files[activeFileId].name}`}
          </div>
        </div>
      )}

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <Suspense
          fallback={
            <div className="p-4 text-catppuccin-overlay0 animate-pulse">
              Loading buffer...
            </div>
          }
        >
          {activeFileId && files[activeFileId] ? (
            files[activeFileId].type === 'terminal' ? (
              <div className="absolute inset-0">
                <TerminalBuffer />
              </div>
            ) : files[activeFileId].type === 'chat' ? (
              <div className="absolute inset-0">
                <ChatBuffer />
              </div>
            ) : files[activeFileId].name.endsWith('.md') ? (
              <div className="p-4 md:p-8 min-h-full flex justify-center">
                <MarkdownViewer content={files[activeFileId].content ?? ''} />
              </div>
            ) : (
              <div className="p-2 md:p-4 min-h-full pb-20">
                <CodeHighlighter
                  text={files[activeFileId].content}
                  type={getFileType(files[activeFileId].name)}
                />
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-catppuccin-overlay0">
              <Terminal size={64} className="mb-4 opacity-20" />
              <p>No buffer open</p>
              <p className="text-xs mt-2">Select a file from the sidebar</p>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
};
