import React, { useState } from 'react';
import { AlertTriangle, SkipForward, PlusCircle, HelpCircle, Volume2, X } from 'lucide-react';
import { useReciteStore, type Correction } from '../store/useReciteStore';
import { cn } from '../lib/utils';

const LABELS: Record<Correction['type'], { title: string; icon: React.ReactNode }> = {
  'wrong-word': { title: 'Wrong word — correct is:', icon: <AlertTriangle className="w-5 h-5" /> },
  skipped: { title: 'You skipped:', icon: <SkipForward className="w-5 h-5" /> },
  added: { title: 'Extra word — continue with:', icon: <PlusCircle className="w-5 h-5" /> },
  stuck: { title: 'Next words:', icon: <HelpCircle className="w-5 h-5" /> },
};

export default function CorrectionBanner() {
  const { correction, clearCorrection } = useReciteStore();
  const [audioFailed, setAudioFailed] = useState(false);

  if (!correction) return null;
  const meta = LABELS[correction.type] ?? LABELS.stuck;

  return (
    <div className="fixed bottom-28 inset-x-0 z-50 px-4 animate-pop-in">
      <div
        className={cn(
          'max-w-lg mx-auto rounded-2xl border shadow-2xl backdrop-blur-xl p-4',
          'bg-card/90 border-accent/40',
          correction.type === 'stuck' ? 'border-accent/60' : 'border-destructive/40',
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'shrink-0 rounded-full p-2',
              correction.type === 'stuck'
                ? 'bg-accent/20 text-accent-foreground'
                : 'bg-destructive/15 text-destructive',
            )}
          >
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {meta.title}
            </p>
            <p dir="rtl" className="font-quran text-2xl mt-1 text-foreground">
              {correction.expectedWords.join(' ')}
            </p>
            {!audioFailed && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                <span>Playing qari recitation of ayah {correction.ayah}</span>
              </div>
            )}
          </div>
          <button
            onClick={clearCorrection}
            className="shrink-0 text-muted-foreground/60 hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <audio autoPlay src={correction.audioUrl} onError={() => setAudioFailed(true)} />
      </div>
    </div>
  );
}
