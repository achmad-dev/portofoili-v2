import { useEffect, useRef, useState } from 'react';
import { FileSystemProvider, useFileSystem } from '@/context/FileSystemContext';
import { Sidebar } from '@/features/explorer/Sidebar';
import { TopBar } from '@/features/layout/TopBar';
import { EditorArea } from '@/features/editor/EditorArea';
import { StatusLine } from '@/features/layout/StatusLine';
import { TerminalBuffer } from '@/features/terminal/TerminalBuffer';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

function Workspace() {
  const {
    activeFileId,
    openFiles,
    isSidebarOpen,
    setActiveFileId,
    setIsSidebarOpen,
  } = useFileSystem();
  const [booting, setBooting] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const bootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    const syncHeight = () => {
      document.documentElement.style.setProperty(
        '--workspace-height',
        `${Math.round(viewport?.height ?? window.innerHeight)}px`
      );
    };
    syncHeight();
    viewport?.addEventListener('resize', syncHeight);
    window.addEventListener('resize', syncHeight);
    return () => {
      viewport?.removeEventListener('resize', syncHeight);
      window.removeEventListener('resize', syncHeight);
      document.documentElement.style.removeProperty('--workspace-height');
    };
  }, []);

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>('.editor-scroll');
    if (!scroller) return;
    const lenis = new Lenis({
      wrapper: scroller,
      content: scroller.querySelector<HTMLElement>('.editor-buffer')!,
    });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (booting) return;
    const scroller = document.querySelector<HTMLElement>('.editor-scroll');
    if (!scroller) return;
    const blocks = gsap.utils.toArray<HTMLElement>('.editor-prose > *');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.set(blocks, { opacity: 0, y: 24 });
    const initial = blocks.slice(0, 4);
    gsap.to(initial, {
      opacity: 1,
      y: 0,
      duration: 0.55,
      stagger: 0.08,
      ease: 'power2.out',
    });
    const triggers = blocks.slice(4).map((block) =>
      ScrollTrigger.create({
        trigger: block,
        scroller,
        start: 'top 88%',
        once: true,
        onEnter: () =>
          gsap.to(block, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
          }),
      })
    );
    ScrollTrigger.refresh();
    return () => {
      triggers.forEach((trigger) => trigger.kill());
      gsap.killTweensOf(blocks);
    };
  }, [booting, activeFileId]);

  useEffect(() => {
    const root = bootRef.current;
    if (!root) {
      gsap.set('.workspace-sidebar, .workspace-topbar, .workspace-status', {
        clearProps: 'transform,opacity,visibility',
      });
      return;
    }
    const animation = gsap.context(() => {
      gsap
        .timeline({ onComplete: () => setBooting(false) })
        .to('.boot-progress', {
          scaleX: 1,
          duration: 0.8,
          ease: 'power2.inOut',
        })
        .to(root, { autoAlpha: 0, duration: 0.35, pointerEvents: 'none' })
        .fromTo(
          '.workspace-sidebar',
          { x: -24 },
          { x: 0, duration: 0.4 },
          '<'
        )
        .fromTo(
          '.workspace-topbar',
          { y: -16 },
          { y: 0, duration: 0.35 },
          '<'
        )
        .fromTo(
          '.workspace-status',
          { y: 12 },
          { y: 0, duration: 0.35 },
          '<'
        );
    }, root.parentElement ?? undefined);
    return () => animation.revert();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 't') {
        event.preventDefault();
        setTerminalOpen((open) => !open);
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setIsSidebarOpen((open) => !open);
      }
      if (event.ctrlKey && event.key === 'Tab' && openFiles.length > 1) {
        event.preventDefault();
        const index = openFiles.indexOf(activeFileId ?? '');
        setActiveFileId(
          openFiles[
            (index + (event.shiftKey ? openFiles.length - 1 : 1)) %
              openFiles.length
          ]
        );
      }
      if (event.key === 'Escape') setTerminalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeFileId, openFiles, setActiveFileId, setIsSidebarOpen]);

  return (
    <div
      className={`workspace ${isSidebarOpen ? '' : 'sidebar-collapsed'} w-full flex flex-col overflow-hidden bg-catppuccin-base text-catppuccin-text font-mono`}
    >
      <div className="workspace-topbar">
        <TopBar
          terminalOpen={terminalOpen}
          onToggleTerminal={() => setTerminalOpen((open) => !open)}
        />
      </div>
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        <div className="workspace-sidebar">
          <Sidebar />
        </div>
        <EditorArea />
      </div>
      <div className="workspace-status">
        <StatusLine terminalOpen={terminalOpen} />
      </div>
      <div
        className={`terminal-drawer ${terminalOpen ? 'is-open' : ''}`}
        aria-hidden={!terminalOpen}
        inert={!terminalOpen}
      >
        <div className="terminal-heading">
          <span>TERMINAL</span>
          <button
            onClick={() => setTerminalOpen(false)}
            aria-label="Close terminal"
          >
            ×
          </button>
        </div>
        <TerminalBuffer isOpen={terminalOpen} />
      </div>
      {booting && (
        <div ref={bootRef} className="boot-screen">
          <div className="boot-logo">
            Achmad's Portfolio<span>_</span>
          </div>
          <div className="boot-caption">loading workspace</div>
          <div className="boot-track">
            <div className="boot-progress" />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <FileSystemProvider>
      <Workspace />
    </FileSystemProvider>
  );
}

export default App;
