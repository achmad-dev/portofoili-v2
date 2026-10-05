import React from 'react';
import { useFileSystem } from '@/context/FileSystemContext';
import { Menu, X, Terminal as TerminalIcon } from 'lucide-react';
import { FileIcon } from '@/components/ui/FileIcon';

export const TopBar: React.FC<{
  terminalOpen: boolean;
  onToggleTerminal: () => void;
}> = ({ terminalOpen, onToggleTerminal }) => {
  const {
    files,
    openFiles,
    activeFileId,
    setActiveFileId,
    closeFile,
    isSidebarOpen,
    setIsSidebarOpen,
  } = useFileSystem();

  return (
    <div className="h-8 bg-catppuccin-mantle flex items-center overflow-x-auto border-b border-black/20 hide-scrollbar flex-shrink-0">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? 'Close explorer' : 'Open explorer'}
        aria-expanded={isSidebarOpen}
        className="px-3 h-full hover:bg-catppuccin-surface0 md:hidden text-catppuccin-subtext0"
      >
        {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      {openFiles.map((fileId) => {
        const file = files[fileId];
        if (!file) return null;

        const isActive = activeFileId === fileId;
        return (
          <div
            key={fileId}
            className={`
              group flex items-center h-full min-w-fit border-r border-black/20 select-none
              ${isActive ? 'bg-catppuccin-base text-catppuccin-text border-t-2 border-t-catppuccin-blue' : 'bg-catppuccin-mantle text-catppuccin-overlay0 hover:bg-catppuccin-crust'}
            `}
          >
            <button
              type="button"
              onClick={() => setActiveFileId(fileId)}
              aria-current={isActive ? 'page' : undefined}
              className="flex items-center h-full pl-3 pr-2"
            >
              <FileIcon name={file.name} type={file.type} />
              <span className="ml-2 text-xs">{file.name}</span>
            </button>
            <button
              type="button"
              onClick={() => closeFile(fileId)}
              aria-label={`Close ${file.name}`}
              className={`mr-2 hover:text-catppuccin-red p-0.5 rounded-md transition-all ${isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      <div className="ml-auto pr-2 flex items-center h-full flex-shrink-0">
        <button
          onClick={onToggleTerminal}
          className={`terminal-toggle flex items-center gap-2 px-3 h-7 text-xs ${terminalOpen ? 'text-catppuccin-mauve bg-catppuccin-surface0' : 'text-catppuccin-subtext0 hover:text-catppuccin-text hover:bg-catppuccin-surface0'}`}
          aria-label="Toggle terminal (Ctrl T)"
          title="Terminal · Ctrl T"
          aria-pressed={terminalOpen}
        >
          <TerminalIcon size={14} />
          <span className="sr-only">Terminal</span>
        </button>
      </div>
    </div>
  );
};
