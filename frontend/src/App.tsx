import { useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { Mic, Square, Sparkles, BookOpenCheck, Ear, Volume2 } from 'lucide-react';
import LiveSurahSelector from './components/LiveSurahSelector';
import LiveQuranView from './components/LiveQuranView';
import CorrectionBanner from './components/CorrectionBanner';
import SessionSummary from './components/SessionSummary';
import { useReciteStore } from './store/useReciteStore';
import { cn } from './lib/utils';

function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pattern-islamic">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl animate-float-slow" />
      <div className="absolute bottom-0 -right-24 w-[420px] h-[420px] rounded-full bg-accent/10 blur-3xl animate-float-slower" />
      <div className="absolute top-1/3 -left-24 w-[300px] h-[300px] rounded-full bg-primary/5 blur-3xl animate-float-slower" />
    </div>
  );
}

export default function App() {
  const { words, pos, recording, summary, surahName, transcript, error, stop } = useReciteStore();

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
    const progress = Math.round((pos / words.length) * 100);
    return (
      <div className="min-h-screen flex flex-col">
        <Background />
        <header className="sticky top-0 z-40 glass border-b border-border/50 px-4 pt-3 pb-2 text-center">
          <p className="text-sm font-semibold">{surahName}</p>
          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 mt-0.5">
            {recording ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Listening — recite at your own pace
              </>
            ) : (
              'Paused'
            )}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden max-w-md mx-auto">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {pos} / {words.length} words · {progress}%
          </p>
        </header>

        <main className="flex-1 overflow-y-auto w-full mx-auto max-w-2xl px-3 pt-4 pb-44">
          <div className="rounded-3xl border border-accent/25 bg-card/70 backdrop-blur shadow-xl shadow-primary/5">
            <LiveQuranView />
          </div>
        </main>

        {transcript && (
          <div className="fixed bottom-24 inset-x-0 px-6 pointer-events-none">
            <div className="max-w-lg mx-auto flex items-center justify-center gap-2 text-xs text-muted-foreground/80">
              <Ear className="w-3.5 h-3.5 shrink-0" />
              <p dir="rtl" className="truncate">{transcript}</p>
            </div>
          </div>
        )}

        <footer className="fixed bottom-0 inset-x-0 z-40 glass border-t border-border/50 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-center gap-6">
            <button
              onClick={() => void stop()}
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all',
                'bg-gradient-to-br from-destructive to-red-700 text-destructive-foreground',
                'hover:scale-105 active:scale-95',
                recording && 'ring-4 ring-destructive/25 animate-glow',
              )}
              aria-label="Finish session"
            >
              <Square className="w-6 h-6" />
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-1.5">Tap to finish</p>
          {error && <p className="text-center text-xs text-destructive mt-1">{error}</p>}
        </footer>

        <CorrectionBanner />
      </div>
    );
  }

  // Welcome / selection screen
  return (
    <div className="min-h-screen flex flex-col px-4 py-10">
      <Background />
      <div className="text-center mb-8 animate-fade-in-up">
        <div className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/15 to-accent/25 border border-accent/30 shadow-lg shadow-primary/10 flex items-center justify-center">
          <BookOpenCheck className="w-10 h-10 text-primary" />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5" /> AI Recitation Companion
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-gradient">Quranic AI Agent</h1>
        <p className="font-quran text-xl text-muted-foreground mt-2">رفيقك في التلاوة</p>
        <p className="text-sm text-muted-foreground mt-3 max-w-sm mx-auto leading-relaxed">
          Recite, and the AI follows word by word — correcting mistakes instantly with a qari's
          voice, like a muqri by your side.
        </p>
        <div className="flex items-center justify-center gap-4 mt-5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5">
            <Mic className="w-3.5 h-3.5 text-primary" /> Live listening
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent-foreground" /> Instant correction
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5">
            <Volume2 className="w-3.5 h-3.5 text-primary" /> Qari voice
          </span>
        </div>
      </div>
      <LiveSurahSelector />
      <p className="mt-10 text-center text-xs text-muted-foreground/50 font-quran">
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
      </p>
    </div>
  );
}
