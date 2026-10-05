import React, { useEffect, useState } from 'react';
import { useFileSystem } from '@/context/FileSystemContext';
import { GitBranch } from 'lucide-react';

export const StatusLine: React.FC<{ terminalOpen?: boolean }> = ({
  terminalOpen = false,
}) => {
  const { files, activeFileId, getFileType } = useFileSystem();
  const [position, setPosition] = useState({ line: 1, percent: 100 });

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>('.editor-scroll');
    if (!scroller) return;
    const update = () => {
      const distance = scroller.scrollHeight - scroller.clientHeight;
      const blocks =
        scroller.querySelectorAll<HTMLElement>('.editor-prose > *');
      let line = 1;
      for (const block of blocks) {
        if (block.offsetTop + block.offsetHeight > scroller.scrollTop + 24)
          break;
        line++;
      }
      setPosition({
        line,
        percent:
          distance > 0
            ? Math.round((scroller.scrollTop / distance) * 100)
            : 100,
      });
    };
    const frame = requestAnimationFrame(update);
    scroller.addEventListener('scroll', update);
    const observer = new ResizeObserver(update);
    const buffer = scroller.querySelector('.editor-buffer');
    if (buffer) observer.observe(buffer);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [activeFileId]);

  const fileType =
    activeFileId && files[activeFileId]
      ? files[activeFileId].type === 'chat'
        ? 'CHAT'
        : getFileType(files[activeFileId].name).toUpperCase()
      : 'TXT';

  const getModeColor = () => {
    if (!activeFileId || !files[activeFileId]) return 'bg-catppuccin-blue';
    if (files[activeFileId].type === 'chat') return 'bg-catppuccin-green';
    return 'bg-catppuccin-blue';
  };

  const getModeText = () => {
    if (!activeFileId || !files[activeFileId]) return 'NORMAL';
    if (files[activeFileId].type === 'chat') return 'INSERT';
    return 'NORMAL';
  };

  return (
    <div className="h-7 bg-catppuccin-mantle flex items-center justify-between text-[11px] select-none z-30 w-full flex-shrink-0">
      <div className="flex items-center h-full min-w-0">
        <div
          className={`h-full px-3 flex items-center font-bold text-catppuccin-base ${terminalOpen ? 'bg-catppuccin-mauve' : getModeColor()}`}
        >
          {terminalOpen ? 'TERMINAL' : getModeText()}
        </div>
        <div className="h-full px-3 hidden sm:flex items-center bg-catppuccin-surface0 text-catppuccin-text space-x-2">
          <GitBranch size={10} />
          <span>main</span>
        </div>
        <div className="h-full px-3 flex items-center text-catppuccin-subtext0 truncate max-w-[88px] sm:max-w-[150px] md:max-w-none">
          {activeFileId && files[activeFileId]
            ? files[activeFileId].name
            : '[No Name]'}
        </div>
      </div>

      <div className="flex items-center h-full">
        <div className="h-full px-3 items-center text-catppuccin-overlay0 md:flex hidden">
          Ln {position.line}, Col 1
        </div>
        <div className="h-full px-3 items-center text-catppuccin-overlay0 md:flex hidden">
          utf-8
        </div>
        <div className="h-full px-3 flex items-center text-catppuccin-blue bg-catppuccin-surface0">
          {fileType}
        </div>
        <div className="h-full px-3 flex items-center bg-catppuccin-blue text-catppuccin-base font-bold">
          {position.percent}%
        </div>
      </div>
    </div>
  );
};
