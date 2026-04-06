import { USER_CONFIG } from './user';
import { FileSystemState } from '@/types';

// We dynamically import markdown files using Vite's import.meta.glob
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
    content: `# About Me\n\nHi, I'm **${USER_CONFIG.name}**.\n\nI am a **${USER_CONFIG.role}** based in ${USER_CONFIG.location}.\n\n## Bio\n\n${USER_CONFIG.bio}\n\n## Core Stack\n\n- **Frontend**: ${USER_CONFIG.stack.frontend.join(', ')}\n- **Backend**: ${USER_CONFIG.stack.backend.join(', ')}\n\nType \`:q\` to exit (just kidding).`,
  },
  'contact.md': {
    id: 'contact.md',
    name: 'contact.md',
    type: 'file',
    content: `# Contact\n\n- **Email**: ${USER_CONFIG.email}\n- **GitHub**: ${USER_CONFIG.github}\n- **Twitter**: ${USER_CONFIG.twitter}\n\n-- Send a pull request to my DMs.`,
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
    content: `local user = {\n  name = "${USER_CONFIG.name}",\n  role = "${USER_CONFIG.role}",\n  stack = {\n    frontend = { "${USER_CONFIG.stack.frontend.join('", "')}" },\n    backend = { "${USER_CONFIG.stack.backend.join('", "')}" },\n    tools = { "${USER_CONFIG.stack.tools.join('", "')}" }\n  }\n}\n\nreturn user`,
  },
  'terminal.sh': {
    id: 'terminal.sh',
    name: 'terminal.sh',
    type: 'terminal',
    content: 'TERMINAL_VIEW',
  },
  ...blogFiles,
};
