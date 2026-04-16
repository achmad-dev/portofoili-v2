import { FileSystemState } from '@/types';

// Load all markdown files recursively inside content
const markdownModules = import.meta.glob('@/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const generateFileSystem = () => {
  const fsState: FileSystemState = {
    root: {
      id: 'root',
      name: 'root',
      type: 'folder',
      isOpen: true,
      children: ['content', 'cybersecurity', 'config', 'copilot.chat'],
    },
    content: {
      id: 'content',
      name: 'content',
      type: 'folder',
      isOpen: true,
      children: [], // will be populated
    },
    cybersecurity: {
      id: 'cybersecurity',
      name: 'cybersecurity',
      type: 'folder',
      isOpen: false,
      children: ['terminal.sh'],
    },
    config: {
      id: 'config',
      name: 'config',
      type: 'folder',
      isOpen: false,
      children: ['config.lua'],
    },
    'copilot.chat': {
      id: 'copilot.chat',
      name: 'copilot.chat',
      type: 'chat',
      content: 'AI_CHAT_VIEW',
    },
    'config.lua': {
      id: 'config.lua',
      name: 'config.lua',
      type: 'file',
      content: `local theme = {\n  name = "NvChad Catppuccin",\n  colors = {\n    base = "#1e1e2e",\n    mantle = "#181825",\n    crust = "#11111b",\n    text = "#cdd6f4",\n    mauve = "#cba6f7",\n    pink = "#f5c2e7",\n    red = "#f38ba8",\n    peach = "#fab387",\n    green = "#a6e3a1",\n    blue = "#89b4fa",\n  },\n  font = "JetBrains Mono Nerd Font",\n}\n\nreturn theme`,
    },
    'terminal.sh': {
      id: 'terminal.sh',
      name: 'terminal.sh',
      type: 'terminal',
      content: 'TERMINAL_VIEW',
    },
  };

  const folderChildren: Record<string, string[]> = {};

  for (const path in markdownModules) {
    const content = markdownModules[path] as string;
    // Path looks like /src/content/folder/file.md or /src/content/file.md
    const relativePath = path.split('/src/content/')[1];

    if (!relativePath) continue;

    const parts = relativePath.split('/');
    const filename = parts.pop() as string;

    fsState[filename] = {
      id: filename,
      name: filename,
      type: 'file',
      content: content,
    };

    if (parts.length > 0) {
      const folderName = parts[0];
      if (!fsState[folderName]) {
        fsState[folderName] = {
          id: folderName,
          name: folderName,
          type: 'folder',
          isOpen: false,
          children: [],
        };
        // Add this folder to the root children if not already there
        if (!fsState.root.children?.includes(folderName)) {
          // Insert folders after 'content' to keep it somewhat organized
          const contentIndex = fsState.root.children?.indexOf('content') ?? -1;
          fsState.root.children = fsState.root.children ?? [];
          fsState.root.children.splice(contentIndex + 1, 0, folderName);
        }
      }

      if (!folderChildren[folderName]) {
        folderChildren[folderName] = [];
      }
      folderChildren[folderName].push(filename);
    } else {
      // It's a file directly in content/ (e.g. about.md)
      fsState.content.children = fsState.content.children ?? [];
      fsState.content.children.push(filename);
    }
  }

  // Populate folder children
  for (const folder in folderChildren) {
    if (fsState[folder] && fsState[folder].type === 'folder') {
      fsState[folder].children = folderChildren[folder];
    }
  }

  return fsState;
};

export const INITIAL_FILES: FileSystemState = generateFileSystem();
