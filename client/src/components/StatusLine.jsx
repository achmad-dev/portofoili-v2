import React from 'react';
import { useFileSystem } from '../context/FileSystemContext';
import { GitBranch } from 'lucide-react';

export const StatusLine = () => {
  const { files, activeFileId, getFileType } = useFileSystem();

  const currentFileType = activeFileId
    ? (files[activeFileId].type === 'chat' ? 'CHAT' : files[activeFileId].type === 'terminal' ? 'TERM' : getFileType(files[activeFileId].name).toUpperCase())
    : 'TXT';

  const getModeColor = () => {
    if (!activeFileId) return 'bg-catppuccin-blue';
    if (files[activeFileId].type === 'chat') return 'bg-catppuccin-green';
    if (files[activeFileId].type === 'terminal') return 'bg-catppuccin-peach';
    return 'bg-catppuccin-blue';
  };

  const getModeText = () => {
    if (!activeFileId) return 'NORMAL';
    if (files[activeFileId].type === 'chat' || files[activeFileId].type === 'terminal') return 'INSERT';
    return 'NORMAL';
  };

  return (
    <div className="h-7 bg-catppuccin-mantle flex items-center justify-between text-[11px] select-none z-30 w-full flex-shrink-0">
      <div className="flex items-center h-full">
        <div className={`h-full px-3 flex items-center font-bold text-catppuccin-base ${getModeColor()}`}>
          {getModeText()}
        </div>
        <div className="h-full px-3 flex items-center bg-catppuccin-surface0 text-catppuccin-text space-x-2">
          <GitBranch size={10} />
          <span>main</span>
        </div>
        <div className="h-full px-3 flex items-center text-catppuccin-subtext0 truncate max-w-[150px] md:max-w-none">
          {activeFileId ? files[activeFileId].name : '[No Name]'}
        </div>
      </div>

      <div className="flex items-center h-full">
        <div className="h-full px-3 items-center text-catppuccin-overlay0 md:flex hidden">
          utf-8
        </div>
        <div className="h-full px-3 flex items-center text-catppuccin-blue bg-catppuccin-surface0">
          {currentFileType}
        </div>
        <div className="h-full px-3 flex items-center bg-catppuccin-blue text-catppuccin-base font-bold">
          100%
        </div>
      </div>
    </div>
  );
};
