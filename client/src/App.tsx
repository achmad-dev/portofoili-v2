import { FileSystemProvider } from '@/context/FileSystemContext';
import { Sidebar } from '@/features/explorer/Sidebar';
import { TopBar } from '@/features/layout/TopBar';
import { EditorArea } from '@/features/editor/EditorArea';
import { StatusLine } from '@/features/layout/StatusLine';

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
