import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_FILES } from '../config/files';

const FileSystemContext = createContext();

export const FileSystemProvider = ({ children }) => {
  const [files, setFiles] = useState(INITIAL_FILES);
  const [openFiles, setOpenFiles] = useState(["about.md"]);
  const [activeFileId, setActiveFileId] = useState("about.md");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-close sidebar on small screens when a file opens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // Set initial state based on window size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleFolder = (folderId) => {
    setFiles(prev => ({
      ...prev,
      [folderId]: {
        ...prev[folderId],
        isOpen: !prev[folderId].isOpen
      }
    }));
  };

  const openFile = (fileId) => {
    if (!openFiles.includes(fileId)) {
      setOpenFiles([...openFiles, fileId]);
    }
    setActiveFileId(fileId);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const closeFile = (e, fileId) => {
    e.stopPropagation();
    const newOpenFiles = openFiles.filter(id => id !== fileId);
    setOpenFiles(newOpenFiles);

    if (activeFileId === fileId) {
      if (newOpenFiles.length > 0) {
        setActiveFileId(newOpenFiles[newOpenFiles.length - 1]);
      } else {
        setActiveFileId(null);
      }
    }
  };

  const getFileType = (filename) => {
    if (filename.endsWith('.md')) return 'md';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.lua')) return 'lua';
    if (filename.endsWith('.sh')) return 'sh';
    return 'txt';
  };

  return (
    <FileSystemContext.Provider value={{
      files,
      openFiles,
      activeFileId,
      isSidebarOpen,
      setIsSidebarOpen,
      setActiveFileId,
      toggleFolder,
      openFile,
      closeFile,
      getFileType
    }}>
      {children}
    </FileSystemContext.Provider>
  );
};

export const useFileSystem = () => useContext(FileSystemContext);
