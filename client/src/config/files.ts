import { FileSystemState } from '@/types';

// Load content markdown files (about.md, contact.md)
const contentModules = import.meta.glob('@/content/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// Load algorithm markdown files
const algorithmModules = import.meta.glob('@/content/algorithms/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// Load blog markdown files
const blogModules = import.meta.glob('@/content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// Load project markdown files
const projectModules = import.meta.glob('@/content/projects/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const generateMarkdownFiles = (modules: Record<string, unknown>) => {
  const files: FileSystemState = {};
  const fileIds: string[] = [];

  for (const path in modules) {
    const filename = path.split('/').pop() as string;
    const content = modules[path] as string;

    files[filename] = {
      id: filename,
      name: filename,
      type: 'file',
      content: content,
    };
    fileIds.push(filename);
  }

  return { files, fileIds };
};

const getContentFile = (filename: string): string => {
  const key = Object.keys(contentModules).find((p) =>
    p.endsWith(`/${filename}`)
  );
  return key
    ? (contentModules[key] as string)
    : `# ${filename}\n\nContent not found.`;
};

const { files: blogFiles, fileIds: blogFileIds } = generateMarkdownFiles(blogModules);
const { files: projectFiles, fileIds: projectFileIds } = generateMarkdownFiles(projectModules);
const { files: algorithmFiles, fileIds: algorithmFileIds } = generateMarkdownFiles(algorithmModules);

export const INITIAL_FILES: FileSystemState = {
  root: {
    id: 'root',
    name: 'root',
    type: 'folder',
    isOpen: true,
    children: [
      'content',
      'projects',
      'algorithms',
      'blog',
      'cybersecurity',
      'config',
      'copilot.chat',
    ],
  },
  content: {
    id: 'content',
    name: 'content',
    type: 'folder',
    isOpen: true,
    children: ['about.md', 'contact.md'],
  },
  projects: {
    id: 'projects',
    name: 'projects',
    type: 'folder',
    isOpen: false,
    children: projectFileIds,
  },
  algorithms: {
    id: 'algorithms',
    name: 'algorithms',
    type: 'folder',
    isOpen: false,
    children: algorithmFileIds,
  },
  blog: {
    id: 'blog',
    name: 'blog',
    type: 'folder',
    isOpen: false,
    children: blogFileIds,
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
  'about.md': {
    id: 'about.md',
    name: 'about.md',
    type: 'file',
    content: getContentFile('about.md'),
  },
  'contact.md': {
    id: 'contact.md',
    name: 'contact.md',
    type: 'file',
    content: getContentFile('contact.md'),
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
  ...blogFiles,
  ...projectFiles,
  ...algorithmFiles,
};
