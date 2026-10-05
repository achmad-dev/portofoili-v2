import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeHighlighter } from './CodeHighlighter';
import gsap from 'gsap';

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null
  );
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!lightbox) return;
    closeButton.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [lightbox]);

  return (
    <>
      <div className="editor-prose prose prose-invert prose-catppuccin w-full pb-20 font-sans">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p({ children, ...props }: any) {
              const nodes = React.Children.toArray(children).filter(
                (node) => typeof node !== 'string' || node.trim() !== ''
              );
              const imageGrid =
                nodes.length > 1 &&
                nodes.every(
                  (node) =>
                    React.isValidElement(node) &&
                    'src' in (node.props as Record<string, unknown>)
                );
              return imageGrid ? (
                <div className="work-image-grid">{nodes}</div>
              ) : (
                <p {...props}>{children}</p>
              );
            },
            pre({ children }: any) {
              const code = React.Children.toArray(children).find(
                React.isValidElement
              ) as
                | React.ReactElement<{
                    className?: string;
                    children?: React.ReactNode;
                  }>
                | undefined;
              const lang =
                /language-(\w+)/.exec(code?.props.className || '')?.[1] ||
                'text';
              const text = String(code?.props.children ?? '').replace(
                /\n$/,
                ''
              );
              return (
                <div className="not-prose my-4 rounded-lg overflow-hidden border border-catppuccin-surface1">
                  <div className="bg-catppuccin-mantle px-4 py-2 text-xs text-catppuccin-overlay0 border-b border-catppuccin-surface1">
                    {lang}
                  </div>
                  <div className="p-4 bg-catppuccin-base overflow-x-auto">
                    <CodeHighlighter text={text} type={lang} />
                  </div>
                </div>
              );
            },
            code({ node, children, ...props }: any) {
              return (
                <code
                  className="bg-catppuccin-surface0 text-catppuccin-pink px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            img({ node, ...props }: any) {
              const src = props.src as string;
              const alt = (props.alt as string) || 'Article image';
              return (
                <span className="project-image">
                  <button
                    type="button"
                    className="project-image-button"
                    onClick={() => setLightbox({ src, alt })}
                    aria-label={`View image: ${alt}`}
                  >
                    <img
                      {...props}
                      src={src}
                      alt={alt}
                      loading="lazy"
                      decoding="async"
                      onLoad={(event) => {
                        if (
                          window.matchMedia('(prefers-reduced-motion: reduce)')
                            .matches
                        )
                          return;
                        gsap.fromTo(
                          event.currentTarget,
                          { opacity: 0, y: 14 },
                          {
                            opacity: 1,
                            y: 0,
                            duration: 0.55,
                            ease: 'power2.out',
                          }
                        );
                      }}
                    />
                    <span className="image-zoom-hint">View image</span>
                  </button>
                  {alt !== 'Image' && (
                    <span className="project-image-caption">{alt}</span>
                  )}
                </span>
              );
            },
            a({ node, ...props }: any) {
              return (
                <a
                  className="text-catppuccin-blue hover:text-catppuccin-sapphire underline decoration-catppuccin-surface2 underline-offset-4 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      {lightbox && (
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.alt}
          onClick={() => setLightbox(null)}
        >
          <button
            ref={closeButton}
            className="image-lightbox-close"
            type="button"
            aria-label="Close image"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            onClick={(event) => event.stopPropagation()}
          />
          <p>{lightbox.alt}</p>
        </div>
      )}
    </>
  );
};
