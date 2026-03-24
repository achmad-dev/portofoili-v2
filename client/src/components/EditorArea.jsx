import React, { useState } from 'react';
import { useFileSystem } from '../context/FileSystemContext';
import { callGemini } from '../utils/gemini';
import { Sparkles, Terminal } from 'lucide-react';
import { CodeHighlighter } from './CodeHighlighter';
import { ChatBuffer } from './ChatBuffer';
import { TerminalBuffer } from './TerminalBuffer';

export const EditorArea = () => {
  const { files, activeFileId, getFileType } = useFileSystem();
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyzeBuffer = async () => {
    if (!activeFileId || !files[activeFileId]?.content) return;

    setAnalyzing(true);
    const content = files[activeFileId].content;
    const result = await callGemini(`Analyze this file content and explain what it does concisely for a developer portfolio context: \n\n${content}`);
    alert(`✨ GEMINI ANALYSIS:\n\n${result}`);
    setAnalyzing(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-catppuccin-base relative w-full h-full min-w-0">

      {/* Breadcrumbs / WinBar */}
      {activeFileId && (
        <div className="h-8 flex items-center justify-between px-4 text-xs text-catppuccin-overlay0 border-b border-catppuccin-surface1/50 bg-catppuccin-base flex-shrink-0">
          <div className="flex items-center">
             {files[activeFileId].type === 'terminal' ? 'cybersecurity > terminal' : `portfolio > ${files[activeFileId].name}`}
           </div>

           {/* Context Actions */}
           {files[activeFileId].type === 'file' && (
             <button
               onClick={handleAnalyzeBuffer}
               disabled={analyzing}
               className="flex items-center gap-1.5 hover:text-catppuccin-mauve transition-colors disabled:opacity-50"
             >
               <Sparkles size={12} />
               {analyzing ? 'Analyzing...' : 'Analyze Buffer'}
             </button>
           )}
        </div>
      )}

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        {activeFileId ? (
          files[activeFileId].type === 'terminal' ? (
            <div className="absolute inset-0">
              <TerminalBuffer />
            </div>
          ) : files[activeFileId].type === 'chat' ? (
            <div className="absolute inset-0">
              <ChatBuffer />
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
      </div>
    </div>
  );
};
