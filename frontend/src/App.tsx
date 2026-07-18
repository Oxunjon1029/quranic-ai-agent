import { useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { Mic, Square, Sparkles } from 'lucide-react';
import LiveSurahSelector from './components/LiveSurahSelector';
import LiveQuranView from './components/LiveQuranView';
import CorrectionBanner from './components/CorrectionBanner';
import SessionSummary from './components/SessionSummary';
import { useReciteStore } from './store/useReciteStore';
import { cn } from './lib/utils';

function Background() {
  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl" />
    </div>
  );
}

export default function App() {
  const { words, recording, summary, surahName, transcript, error, stop } = useReciteStore();

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
    } catch {
      // Not running inside Telegram
    }
  }, []);

  // Summary screen
  if (summary) {
    return (
      <div className="min-h-screen px-4 py-8">
        <Background />
        <SessionSummary />
      </div>
    );
  }

  // Live recitation screen
  if (words.length > 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Background />
        <header className="sticky top-0 z-40 glass border-b border-border/50 px-4 py-3 text-center">
          <p className="text-sm font-medium">{surahName}</p>
          <p className="text-[11px] text-muted-foreground">
            {recording ? 'Listening — recite at your own pace' : 'Paused'}
          </p>
        </header>

        <main className="flex-1 overflow-y-auto max-w-2xl w-full mx-auto pb-40">
          <LiveQuranView />
        </main>

        {transcript && (
          <div className="fixed bottom-20 inset-x-0 px-6 pointer-events-none">
            <p
              dir="rtl"
              className="max-w-lg mx-auto text-center text-xs text-muted-foreground/70 truncate"
            >
              {transcript}
            </p>
          </div>
        )}

        <footer className="fixed bottom-0 inset-x-0 z-40 glass border-t border-border/50 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-center">
            <button
              onClick={() => void stop()}
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all',
                'bg-destructive text-destructive-foreground hover:scale-105 active:scale-95',
                recording && 'ring-4 ring-destructive/30 animate-pulse',
              )}
              aria-label="Stop session"
            >
              <Square className="w-5 h-5" />
            </button>
          </div>
          {error && <p className="text-center text-xs text-destructive mt-2">{error}</p>}
        </footer>

        <CorrectionBanner />
      </div>
    );
  }

  // Welcome / selection screen
  return (
    <div className="min-h-screen flex flex-col px-4 py-8">
      <Background />
      <div className="text-center mb-8 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5" /> AI Recitation Companion
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Quranic AI Agent</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Recite, and the AI follows word by word — correcting mistakes instantly with a qari's
          voice, like a muqri by your side.
        </p>
        <div className="inline-flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <Mic className="w-3.5 h-3.5" /> Works best in a quiet room with Chrome
        </div>
      </div>
      <LiveSurahSelector />
      <p className="mt-8 text-center text-[10px] text-muted-foreground/40 font-quran">
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
      </p>
    </div>
  );
}
