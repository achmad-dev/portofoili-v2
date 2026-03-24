import { USER_CONFIG } from '../config/user';

export const INITIAL_FILES = {
  "root": {
    id: "root",
    name: "root",
    type: "folder",
    isOpen: true,
    children: ["content", "projects", "blog", "cybersecurity", "config", "copilot.chat"]
  },
  "content": {
    id: "content",
    name: "content",
    type: "folder",
    isOpen: true,
    children: ["about.md", "contact.md"]
  },
  "projects": {
    id: "projects",
    name: "projects",
    type: "folder",
    isOpen: false,
    children: ["web.json", "systems.json"]
  },
  "blog": {
    id: "blog",
    name: "blog",
    type: "folder",
    isOpen: false,
    children: ["migrating-to-neovim.md", "react-hooks.md", "why-supabase.md"]
  },
  "cybersecurity": {
    id: "cybersecurity",
    name: "cybersecurity",
    type: "folder",
    isOpen: false,
    children: ["terminal.sh", "thm-writeup.md"]
  },
  "config": {
    id: "config",
    name: "config",
    type: "folder",
    isOpen: false,
    children: ["stack.lua"]
  },
  "copilot.chat": {
    id: "copilot.chat",
    name: "copilot.chat",
    type: "chat",
    content: "AI_CHAT_VIEW"
  },
  "about.md": {
    id: "about.md",
    name: "about.md",
    type: "file",
    content: `# About Me\n\nHi, I'm **${USER_CONFIG.name}**.\n\nI am a **${USER_CONFIG.role}** based in ${USER_CONFIG.location}.\n\n## Bio\n\n${USER_CONFIG.bio}\n\n## Core Stack\n\n- **Frontend**: ${USER_CONFIG.stack.frontend.join(", ")}\n- **Backend**: ${USER_CONFIG.stack.backend.join(", ")}\n\nType \`:q\` to exit (just kidding).`
  },
  "contact.md": {
    id: "contact.md",
    name: "contact.md",
    type: "file",
    content: `# Contact\n\n- **Email**: ${USER_CONFIG.email}\n- **GitHub**: ${USER_CONFIG.github}\n- **Twitter**: ${USER_CONFIG.twitter}\n\n-- Send a pull request to my DMs.`
  },
  "web.json": {
    id: "web.json",
    name: "web.json",
    type: "file",
    content: JSON.stringify([
      { name: "E-Commerce Dashboard", stack: ["React", "Tailwind", "Supabase"], status: "Live" },
      { name: "Portfolio v1", stack: ["HTML", "SASS"], status: "Archived" }
    ], null, 2)
  },
  "systems.json": {
    id: "systems.json",
    name: "systems.json",
    type: "file",
    content: JSON.stringify([
      { name: "Rust File Parser", stack: ["Rust", "Clap"], status: "In Progress" },
      { name: "Go CLI Tool", stack: ["Go"], status: "Completed" }
    ], null, 2)
  },
  "stack.lua": {
    id: "stack.lua",
    name: "stack.lua",
    type: "file",
    content: `local user = {\n  name = "${USER_CONFIG.name}",\n  role = "${USER_CONFIG.role}",\n  stack = {\n    frontend = { "${USER_CONFIG.stack.frontend.join('", "')}" },\n    backend = { "${USER_CONFIG.stack.backend.join('", "')}" },\n    tools = { "${USER_CONFIG.stack.tools.join('", "')}" }\n  }\n}\n\nreturn user`
  },
  "migrating-to-neovim.md": {
    id: "migrating-to-neovim.md",
    name: "migrating-to-neovim.md",
    type: "file",
    content: `---\ntitle: Migrating to Neovim\ncategory: Tech\ndate: 2023-10-15\n---\n\n# Migrating to Neovim\n\nIt wasn't easy, but here is how I did it...\n\n1. Install Neovim\n2. Install lazy.nvim\n3. Configure Catppuccin\n4. Enjoy the blazingly fast editing experience.`
  },
  "react-hooks.md": {
    id: "react-hooks.md",
    name: "react-hooks.md",
    type: "file",
    content: `---\ntitle: Understanding React Hooks\ncategory: Tech\ndate: 2023-11-02\n---\n\n# React Hooks\n\n\`useEffect\` is tricky. Let's break it down.\n\nThe dependency array is your friend, not your enemy.`
  },
  "why-supabase.md": {
    id: "why-supabase.md",
    name: "why-supabase.md",
    type: "file",
    content: `---\ntitle: Why Supabase?\ncategory: Tech\ndate: 2024-01-05\n---\n\n# Why Supabase?\n\nIt is just Postgres but easier.\n\nRow Level Security (RLS) is a game changer for frontend-first apps.`
  },
  "terminal.sh": {
    id: "terminal.sh",
    name: "terminal.sh",
    type: "terminal",
    content: "TERMINAL_VIEW"
  },
  "thm-writeup.md": {
    id: "thm-writeup.md",
    name: "thm-writeup.md",
    type: "file",
    content: `---\ntitle: TryHackMe - Basic Pentesting\ncategory: Cybersecurity\ndate: 2024-02-20\n---\n\n# TryHackMe Basic Pentesting Writeup\n\n## Reconnaissance\n\nRunning \`nmap\` against the target:\n\n\`\`\`bash\nnmap -sC -sV -oN nmap/initial <target_ip>\n\`\`\`\n\nFound open ports 22 (SSH), 80 (HTTP), and 445 (SMB).`
  }
};
