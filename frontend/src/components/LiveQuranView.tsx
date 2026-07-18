import React, { useEffect, useRef } from 'react';
import { useReciteStore } from '../store/useReciteStore';
import { cn } from '../lib/utils';

export default function LiveQuranView() {
  const { words, pos, recording } = useReciteStore();
  const currentRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [pos]);

  let lastAyah = 0;

  return (
    <div
      dir="rtl"
      className="font-quran text-3xl leading-[2.6] text-center px-4 py-6 select-none"
    >
      {words.map((w) => {
        const isCurrent = recording && w.globalIndex === pos;
        const ayahMarker =
          w.ayah !== lastAyah && w.globalIndex > 0 ? (
            <span
              key={`m-${w.ayah}`}
              className="inline-flex items-center justify-center w-8 h-8 mx-1 text-xs rounded-full border border-accent/60 text-accent-foreground/70 bg-accent/10 align-middle font-sans"
            >
              {w.ayah - 1}
            </span>
          ) : null;
        lastAyah = w.ayah;
        return (
          <React.Fragment key={w.globalIndex}>
            {ayahMarker}
            <span
              ref={isCurrent ? currentRef : undefined}
              className={cn(
                'inline-block px-1 mx-0.5 rounded-lg transition-all duration-300',
                w.status === 'pending' && 'text-muted-foreground/60',
                w.status === 'correct' && 'text-primary',
                w.status === 'mistake' && 'text-destructive underline decoration-wavy decoration-2 underline-offset-8',
                isCurrent &&
                  'text-foreground bg-accent/20 ring-2 ring-accent/70 animate-pulse shadow-[0_0_20px_hsl(43_96%_56%/0.35)]',
              )}
            >
              {w.display}
            </span>
          </React.Fragment>
        );
      })}
      {words.length > 0 && (
        <span className="inline-flex items-center justify-center w-8 h-8 mx-1 text-xs rounded-full border border-accent/60 text-accent-foreground/70 bg-accent/10 align-middle font-sans">
          {words[words.length - 1].ayah}
        </span>
      )}
    </div>
  );
}
