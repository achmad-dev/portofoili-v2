import React from 'react';
import { useFileSystem } from '@/context/FileSystemContext';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { FileIcon } from '@/components/ui/FileIcon';

// This component renders the sidebar for the file explorer, displaying folders and files in a tree structure. It uses the `useFileSystem` hook to access the file system state and actions.
export const Sidebar: React.FC = () => {
  const { files, activeFileId, isSidebarOpen, toggleFolder, openFile } =
    useFileSystem();

  const renderTree = (nodeId: string, depth = 0): React.ReactNode => {
    const node = files[nodeId];
    if (!node) return null;

    const isActive = activeFileId === nodeId;
    const paddingLeft = `${depth * 16 + 12}px`;

    if (node.type === 'folder') {
      return (
        <div key={nodeId}>
          <button
            type="button"
            aria-expanded={node.isOpen}
            className="flex w-full items-center py-1 text-left hover:bg-catppuccin-surface0 text-catppuccin-subtext0 hover:text-catppuccin-text transition-colors"
            style={{ paddingLeft }}
            onClick={() => toggleFolder(nodeId)}
          >
            {node.isOpen ? (
              <ChevronDown size={14} className="mr-1" />
            ) : (
              <ChevronRight size={14} className="mr-1" />
            )}
            <Folder
              size={14}
              className={`mr-2 ${node.isOpen ? 'text-catppuccin-blue' : 'text-catppuccin-blue/70'}`}
            />
            <span className="text-sm font-medium">{node.name}</span>
          </button>
          {node.isOpen &&
            node.children?.map((childId) => renderTree(childId, depth + 1))}
        </div>
      );
    } else {
      return (
        <button
          key={nodeId}
          type="button"
          aria-current={isActive ? 'page' : undefined}
          className={`flex w-full items-center py-1 text-left transition-colors overflow-hidden ${isActive ? 'bg-catppuccin-surface0 text-white border-l-2 border-catppuccin-blue' : 'text-catppuccin-subtext0 hover:bg-catppuccin-surface0 hover:text-catppuccin-text'}`}
          style={{
            paddingLeft: isActive ? `${depth * 16 + 10}px` : paddingLeft,
          }}
          onClick={() => openFile(nodeId)}
        >
          <div className="mr-2">
            <FileIcon name={node.name} type={node.type} />
          </div>
          <span className="text-sm min-w-0 truncate" title={node.name}>
            {node.name}
          </span>
        </button>
      );
    }
  };

  return (
    <div
      inert={!isSidebarOpen}
      className={`
        absolute top-0 left-0 md:static z-20 h-full w-64 max-w-[85vw] md:max-w-none overflow-hidden bg-catppuccin-crust border-r border-black/20 transition-transform md:transition-[width,transform] duration-300 ease-in-out flex-shrink-0
        ${isSidebarOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:w-0 md:translate-x-0'}
      `}
    >
      <div className="p-3 text-xs font-bold text-catppuccin-blue uppercase tracking-wider flex items-center justify-between">
        <span>Explorer</span>
        <span className="text-catppuccin-overlay0 text-[10px]">v2.5.0</span>
      </div>
      <nav
        aria-label="File explorer"
        className="overflow-y-auto h-[calc(100%-40px)] custom-scrollbar"
      >
        {renderTree('root')}
      </nav>
    </div>
  );
};
