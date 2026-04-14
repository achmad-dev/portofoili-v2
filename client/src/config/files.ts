import { FileSystemState } from '@/types';

// Load content markdown files (about.md, contact.md)
const contentModules = import.meta.glob('@/content/*.md', {
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

const generateBlogFiles = () => {
  const blogFiles: FileSystemState = {};
  const blogFileIds: string[] = [];

  for (const path in blogModules) {
    const filename = path.split('/').pop() as string;
    const content = blogModules[path] as string;

    blogFiles[filename] = {
      id: filename,
      name: filename,
      type: 'file',
      content: content,
    };
    blogFileIds.push(filename);
  }

  return { blogFiles, blogFileIds };
};

const getContentFile = (filename: string): string => {
  const key = Object.keys(contentModules).find((p) =>
    p.endsWith(`/${filename}`)
  );
  return key
    ? (contentModules[key] as string)
    : `# ${filename}\n\nContent not found.`;
};

const { blogFiles, blogFileIds } = generateBlogFiles();

export const INITIAL_FILES: FileSystemState = {
  root: {
    id: 'root',
    name: 'root',
    type: 'folder',
    isOpen: true,
    children: [
      'content',
      'projects',
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
    children: ['web.json', 'systems.json'],
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
    children: ['stack.lua'],
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
  'web.json': {
    id: 'web.json',
    name: 'web.json',
    type: 'file',
    content: JSON.stringify(
      [
        {
          name: 'E-Commerce Dashboard',
          stack: ['React', 'Tailwind', 'Supabase'],
          status: 'Live',
        },
        { name: 'Portfolio v1', stack: ['HTML', 'SASS'], status: 'Archived' },
      ],
      null,
      2
    ),
  },
  'systems.json': {
    id: 'systems.json',
    name: 'systems.json',
    type: 'file',
    content: JSON.stringify(
      [
        {
          name: 'Rust File Parser',
          stack: ['Rust', 'Clap'],
          status: 'In Progress',
        },
        { name: 'Go CLI Tool', stack: ['Go'], status: 'Completed' },
      ],
      null,
      2
    ),
  },
  'stack.lua': {
    id: 'stack.lua',
    name: 'stack.lua',
    type: 'file',
    content: `local user = {\n  name = "Achmad Al Fazari",\n  role = "Full Stack Engineer",\n  stack = {\n    frontend = { "React", "TypeScript", "Tailwind", "Next.js" },\n    backend = { "Node.js", "Go", "PostgreSQL", "Supabase" },\n    tools = { "Neovim", "Tmux", "Docker", "Linux" }\n  }\n}\n\nreturn user`,
  },
  'terminal.sh': {
    id: 'terminal.sh',
    name: 'terminal.sh',
    type: 'terminal',
    content: 'TERMINAL_VIEW',
  },
  ...blogFiles,
};
