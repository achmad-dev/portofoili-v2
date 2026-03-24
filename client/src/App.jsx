import React from 'react';
import { FileSystemProvider } from './context/FileSystemContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { EditorArea } from './components/EditorArea';
import { StatusLine } from './components/StatusLine';

function App() {
  return (
    <FileSystemProvider>
      <div className="flex flex-col h-screen w-full bg-catppuccin-base text-catppuccin-text font-mono overflow-hidden">
        <TopBar />

        <div className="flex flex-1 overflow-hidden relative min-h-0">
          <Sidebar />
          <EditorArea />
        </div>

        <StatusLine />
      </div>
    </FileSystemProvider>
  );
}

export default App;
