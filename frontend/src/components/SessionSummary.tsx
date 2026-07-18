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
      <Card className="p-6 text-center glass border-primary/20">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Session Complete</h2>
        <p className="text-sm text-muted-foreground mt-1">{surahName}</p>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <Stat label="Accuracy" value={`${Math.max(0, accuracy)}%`} highlight />
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
