import { FileSystemState } from '@/types';

const markdownModules = import.meta.glob('@/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const files: FileSystemState = {
  root: {
    id: 'root',
    name: 'root',
    type: 'folder',
    isOpen: true,
    children: ['content', 'config', 'copilot.chat'],
  },
  content: {
    id: 'content',
    name: 'content',
    type: 'folder',
    isOpen: true,
    children: [],
  },
  config: {
    id: 'config',
    name: 'config',
    type: 'folder',
    isOpen: false,
    children: ['config/config.lua'],
  },
  'copilot.chat': {
    id: 'copilot.chat',
    name: 'copilot.chat',
    type: 'chat',
    content: 'AI_CHAT_VIEW',
  },
  'config/config.lua': {
    id: 'config/config.lua',
    name: 'config.lua',
    type: 'file',
    content: `local theme = {
  name = "Catppuccin Mocha",
  fonts = {
    editor = "JetBrains Mono",
    reader = "Inter",
  },
  colors = {
    base = "#1e1e2e",
    mantle = "#181825",
    crust = "#11111b",
    text = "#cdd6f4",
    subtext = "#a6adc8",
    overlay = "#6c7086",
    surface = "#313244",
    border = "#45475a",
    blue = "#89b4fa",
    green = "#a6e3a1",
    mauve = "#cba6f7",
    pink = "#f5c2e7",
    red = "#f38ba8",
    yellow = "#f9e2af",
  },
  ui = {
    explorer = "crust",
    editor = "base",
    tabline = "mantle",
    statusline = "mantle",
    terminal = "base",
    active_file = "blue",
  },
}

return theme`,
  },
};

for (const [modulePath, content] of Object.entries(markdownModules)) {
  const relativePath = modulePath.split('/content/')[1];
  if (!relativePath) continue;

  const parts = relativePath.split('/');
  const filename = parts.pop()!;
  let parentId = parts.length ? '' : 'content';

  for (const folder of parts) {
    const folderId = parentId ? `${parentId}/${folder}` : folder;
    if (!files[folderId]) {
      files[folderId] = {
        id: folderId,
        name: folder,
        type: 'folder',
        isOpen: false,
        children: [],
      };
      files[parentId || 'root'].children!.push(folderId);
    }
    parentId = folderId;
  }

  const fileId = `${parentId}/${filename}`;
  files[fileId] = {
    id: fileId,
    name: filename,
    type: 'file',
    content: content as string,
  };
  files[parentId].children!.push(fileId);
}

for (const node of Object.values(files)) {
  node.children?.sort((a, b) => {
    if (a.endsWith('/about.md')) return -1;
    if (b.endsWith('/about.md')) return 1;
    return files[a].name.localeCompare(files[b].name);
  });
}

// Keep the original explorer's top-level order while showing only real content folders.
files.root.children = [
  'content',
  ...files.root.children!.filter(
    (id) => !['content', 'config', 'copilot.chat'].includes(id)
  ),
  'config',
  'copilot.chat',
];

export const INITIAL_FILES = files;
