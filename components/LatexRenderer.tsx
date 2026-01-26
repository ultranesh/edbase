'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';

interface LatexRendererProps {
  text: string;
  className?: string;
}

export default function LatexRenderer({ text, className = '' }: LatexRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !text) return;

    try {
      // Split by inline math $...$
      const parts = text.split(/(\$[^$]+\$)/g);

      containerRef.current.innerHTML = parts
        .map((part) => {
          if (part.startsWith('$') && part.endsWith('$')) {
            const math = part.slice(1, -1);
            try {
              // Check if it contains block-level elements like \begin{cases}
              const isBlock = math.includes('\\begin{') || math.includes('\\\\');
              return katex.renderToString(math, {
                throwOnError: false,
                displayMode: isBlock,
                trust: true, // Allow \begin{cases} and other environments
                strict: false,
              });
            } catch (e) {
              console.error('LaTeX error:', e);
              return part;
            }
          }
          // Escape HTML and convert newlines
          return part
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br/>');
        })
        .join('');
    } catch (error) {
      console.error('LaTeX rendering error:', error);
      containerRef.current.textContent = text;
    }
  }, [text]);

  return <div ref={containerRef} className={className} style={{ lineHeight: '1.8' }} />;
}
