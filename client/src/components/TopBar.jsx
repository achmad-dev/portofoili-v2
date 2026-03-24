import React from 'react';
import { useFileSystem } from '../context/FileSystemContext';
import { Menu, X } from 'lucide-react';
import { FileIcon } from './FileIcon';

export const TopBar = () => {
  const {
    files,
    openFiles,
    activeFileId,
    setActiveFileId,
    closeFile,
    isSidebarOpen,
    setIsSidebarOpen
  } = useFileSystem();

  return (
    <div className="h-9 bg-catppuccin-mantle flex items-center overflow-x-auto border-b border-black/20 hide-scrollbar flex-shrink-0">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="px-3 h-full hover:bg-catppuccin-surface0 md:hidden text-catppuccin-subtext0"
      >
        <Menu size={16} />
      </button>

      {openFiles.map(fileId => {
        const file = files[fileId];
        const isActive = activeFileId === fileId;
        return (
          <div
            key={fileId}
            onClick={() => setActiveFileId(fileId)}
            className={`
              group flex items-center px-3 h-full min-w-fit cursor-pointer border-r border-black/20 select-none
              ${isActive ? 'bg-catppuccin-base text-catppuccin-text border-t-2 border-t-catppuccin-blue' : 'bg-catppuccin-mantle text-catppuccin-overlay0 hover:bg-catppuccin-crust'}
            `}
          >
            <FileIcon name={file.name} type={file.type} />
            <span className="ml-2 text-xs mr-2">{file.name}</span>
            <button
              onClick={(e) => closeFile(e, fileId)}
              className={`opacity-0 group-hover:opacity-100 hover:text-catppuccin-red p-0.5 rounded-md transition-all ${isActive ? 'opacity-100' : ''}`}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
