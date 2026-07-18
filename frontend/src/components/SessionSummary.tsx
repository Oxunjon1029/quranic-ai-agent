import React, { useRef } from 'react';
import { CheckCircle2, AlertTriangle, SkipForward, PlusCircle, HelpCircle, Play, RotateCcw } from 'lucide-react';
import { useReciteStore, type MistakeRecord } from '../store/useReciteStore';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const pad = (n: number) => String(n).padStart(3, '0');

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; tone: string }> = {
  'wrong-word': { label: 'Wrong word', icon: <AlertTriangle className="w-4 h-4" />, tone: 'text-destructive bg-destructive/10' },
  skipped: { label: 'Skipped', icon: <SkipForward className="w-4 h-4" />, tone: 'text-destructive bg-destructive/10' },
  added: { label: 'Extra word', icon: <PlusCircle className="w-4 h-4" />, tone: 'text-amber-600 bg-amber-500/10' },
  stuck: { label: 'Hesitation', icon: <HelpCircle className="w-4 h-4" />, tone: 'text-amber-600 bg-amber-500/10' },
};

export default function SessionSummary() {
  const { summary, surah, surahName, reset } = useReciteStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!summary) return null;
  const accuracy = summary.wordsTotal
    ? Math.round(
        ((summary.wordsRead - summary.mistakes.filter((m) => m.type !== 'stuck').length) /
          summary.wordsTotal) * 100,
      )
    : 0;

  const playAyah = (ayah: number) => {
    if (!surah || !audioRef.current) return;
    audioRef.current.src = `https://everyayah.com/data/Alafasy_128kbps/${pad(surah)}${pad(ayah)}.mp3`;
    void audioRef.current.play();
  };

  return (
    <div className="w-full max-w-lg mx-auto animate-fade-in-up space-y-4 pb-10">
      <Card className="p-6 text-center glass border-primary/20 overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <AccuracyRing value={Math.max(0, accuracy)} />
        <h2 className="text-xl font-bold mt-3 text-gradient inline-block">Session Complete</h2>
        <p className="text-sm text-muted-foreground mt-1">{surahName}</p>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <Stat label="Words read" value={`${summary.wordsRead}/${summary.wordsTotal}`} />
          <Stat label="Mistakes" value={String(summary.mistakes.length)} />
        </div>
      </Card>

      {summary.mistakes.length === 0 ? (
        <Card className="p-5 text-center text-sm text-muted-foreground">
          Flawless recitation — no mistakes detected. Ma sha Allah!
        </Card>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Mistakes</h3>
          {summary.mistakes.map((m: MistakeRecord, i: number) => {
            const meta = TYPE_META[m.type] ?? TYPE_META.stuck;
            return (
              <Card key={i} className="p-3 flex items-center gap-3">
                <span className={cn('shrink-0 rounded-full p-2', meta.tone)}>{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {meta.label} · Ayah {m.ayah}
                  </p>
                  <p dir="rtl" className="font-quran text-lg truncate">{m.expected}</p>
                  {m.actual && (
                    <p dir="rtl" className="text-xs text-destructive/80 truncate">
                      You said: {m.actual}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => playAyah(m.ayah)} className="shrink-0">
                  <Play className="w-3.5 h-3.5" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Button className="w-full" onClick={reset}>
        <RotateCcw className="w-4 h-4 mr-2" /> New Session
      </Button>
      <audio ref={audioRef} />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-secondary/60 py-3">
      <p className={cn('text-lg font-semibold', highlight && 'text-primary')}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function AccuracyRing({ value }: { value: number }) {
  const r = 50;
  const c = 2 * Math.PI * r; // ~314
  const offset = c - (c * value) / 100;
  return (
    <div className="relative mx-auto w-32 h-32">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" className="stroke-secondary" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="animate-ring"
          stroke="url(#ringGrad)"
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(160 84% 35%)" />
            <stop offset="100%" stopColor="hsl(43 96% 50%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-primary">{value}%</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Accuracy</span>
      </div>
      {value === 100 && (
        <CheckCircle2 className="absolute -top-1 -right-1 w-7 h-7 text-primary bg-card rounded-full" />
      )}
    </div>
  );
}
