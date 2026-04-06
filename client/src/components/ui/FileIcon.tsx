import React from 'react';
import {
  Folder,
  FileText,
  FileJson,
  FileCode,
  Bot,
  TerminalSquare,
} from 'lucide-react';

interface FileIconProps {
  name: string;
  type: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ name, type }) => {
  if (type === 'folder')
    return (
      <Folder
        size={16}
        className="text-catppuccin-blue fill-catppuccin-blue/20"
      />
    );
  if (name === 'copilot.chat')
    return <Bot size={16} className="text-catppuccin-mauve" />;
  if (type === 'terminal' || name.endsWith('.sh'))
    return <TerminalSquare size={16} className="text-catppuccin-green" />;
  if (name.endsWith('.md'))
    return <FileText size={16} className="text-catppuccin-yellow" />;
  if (name.endsWith('.json'))
    return <FileJson size={16} className="text-catppuccin-peach" />;
  if (name.endsWith('.lua'))
    return <FileCode size={16} className="text-catppuccin-sapphire" />;
  return <FileText size={16} className="text-catppuccin-overlay0" />;
};
