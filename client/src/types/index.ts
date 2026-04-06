export interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'chat' | 'terminal' | 'database';
  isOpen?: boolean;
  children?: string[];
  content?: string;
}

export interface FileSystemState {
  [key: string]: FileNode;
}

export interface UserConfig {
  name: string;
  role: string;
  bio: string;
  email: string;
  github: string;
  twitter: string;
  location: string;
  stack: {
    frontend: string[];
    backend: string[];
    tools: string[];
  };
}
