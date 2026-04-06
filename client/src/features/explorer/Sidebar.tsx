import React from 'react';
import { useFileSystem } from '@/context/FileSystemContext';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { FileIcon } from '@/components/ui/FileIcon';

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
          <div
            className="flex items-center py-1 cursor-pointer hover:bg-catppuccin-surface0 text-catppuccin-subtext0 hover:text-catppuccin-text transition-colors"
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
          </div>
          {node.isOpen &&
            node.children?.map((childId) => renderTree(childId, depth + 1))}
        </div>
      );
    } else {
      return (
        <div
          key={nodeId}
          className={`flex items-center py-1 cursor-pointer transition-colors ${isActive ? 'bg-catppuccin-surface0 text-white border-l-2 border-catppuccin-blue' : 'text-catppuccin-subtext0 hover:bg-catppuccin-surface0 hover:text-catppuccin-text'}`}
          style={{
            paddingLeft: isActive ? `${depth * 16 + 10}px` : paddingLeft,
          }}
          onClick={() => openFile(nodeId)}
        >
          <div className="mr-2">
            <FileIcon name={node.name} type={node.type} />
          </div>
          <span className="text-sm">{node.name}</span>
        </div>
      );
    }
  };

  return (
    <div
      className={`
        absolute md:static z-20 h-full bg-catppuccin-crust border-r border-black/20 transition-all duration-300 ease-in-out flex-shrink-0
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0'}
      `}
    >
      <div className="p-3 text-xs font-bold text-catppuccin-blue uppercase tracking-wider flex items-center justify-between">
        <span>Explorer</span>
        <span className="text-catppuccin-overlay0 text-[10px]">v2.5.0</span>
      </div>
      <div className="overflow-y-auto h-[calc(100%-40px)] custom-scrollbar">
        {renderTree('root')}
      </div>
    </div>
  );
};
