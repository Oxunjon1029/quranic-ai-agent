import React from 'react';
import { SURAHS, type Surah } from '../data/surahs';
import { useAppStore } from '../store/useSalahStore';
import { Card } from './ui/card';
import { BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SurahSelector() {
  const { selectSurah, startSession } = useAppStore();

  const handleSelect = (surah: Surah) => {
    selectSurah(surah);
    startSession();
  };

  return (
    <div className="w-full max-w-lg mx-auto animate-fade-in-up">
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-foreground">Choose a Surah to Practice</h2>
        <p className="text-sm text-muted-foreground">Select the surah you want to recite and check your pronunciation</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SURAHS.map((surah) => (
          <Card
            key={surah.id}
            onClick={() => handleSelect(surah)}
            className={cn(
              "p-4 cursor-pointer hover:shadow-lg hover:border-primary/30 hover:scale-[1.02]",
              "transition-all duration-200 active:scale-[0.98]",
              "glass"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-arabic text-lg text-foreground leading-tight" dir="rtl">
                  {surah.arabicName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{surah.name}</p>
                <p className="text-[10px] text-muted-foreground/60">{surah.ayahs.length} ayahs</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
