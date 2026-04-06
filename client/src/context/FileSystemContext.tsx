import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { INITIAL_FILES } from '@/config/files';
import { FileSystemState } from '@/types';

interface FileSystemContextType {
  files: FileSystemState;
  openFiles: string[];
  activeFileId: string | null;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveFileId: React.Dispatch<React.SetStateAction<string | null>>;
  toggleFolder: (folderId: string) => void;
  openFile: (fileId: string) => void;
  closeFile: (e: React.MouseEvent, fileId: string) => void;
  getFileType: (filename: string) => string;
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(
  undefined
);

export const FileSystemProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<FileSystemState>(INITIAL_FILES);
  const [openFiles, setOpenFiles] = useState<string[]>(['about.md']);
  const [activeFileId, setActiveFileId] = useState<string | null>('about.md');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleFolder = (folderId: string) => {
    setFiles((prev) => ({
      ...prev,
      [folderId]: {
        ...prev[folderId],
        isOpen: !prev[folderId].isOpen,
      },
    }));
  };

  const openFile = (fileId: string) => {
    if (!openFiles.includes(fileId)) {
      setOpenFiles([...openFiles, fileId]);
    }
    setActiveFileId(fileId);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const closeFile = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const newOpenFiles = openFiles.filter((id) => id !== fileId);
    setOpenFiles(newOpenFiles);

    if (activeFileId === fileId) {
      if (newOpenFiles.length > 0) {
        setActiveFileId(newOpenFiles[newOpenFiles.length - 1]);
      } else {
        setActiveFileId(null);
      }
    }
  };

  const getFileType = (filename: string) => {
    if (filename.endsWith('.md')) return 'md';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.lua')) return 'lua';
    if (filename.endsWith('.sh')) return 'sh';
    return 'txt';
  };

  return (
    <FileSystemContext.Provider
      value={{
        files,
        openFiles,
        activeFileId,
        isSidebarOpen,
        setIsSidebarOpen,
        setActiveFileId,
        toggleFolder,
        openFile,
        closeFile,
        getFileType,
      }}
    >
      {children}
    </FileSystemContext.Provider>
  );
};

export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (context === undefined) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
};
