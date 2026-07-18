import React from 'react';
import { useAppStore } from '../store/useSalahStore';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AyahTracker() {
  const { selectedSurah, currentAyahIndex } = useAppStore();
  if (!selectedSurah) return null;

  const total = selectedSurah.ayahs.length;
  const progress = ((currentAyahIndex) / (total - 1)) * 100;

  return (
    <div className="w-full animate-fade-in-up">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground font-medium">
          Ayah {currentAyahIndex + 1} of {total}
        </p>
        <p className="text-xs text-primary font-semibold">
          {Math.round(progress)}%
        </p>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Ayah dots */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {selectedSurah.ayahs.map((_, index) => {
          const isActive = currentAyahIndex === index;
          const isPassed = currentAyahIndex > index;

          return (
            <div
              key={index}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-300",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-110"
                  : isPassed
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isPassed ? <Check className="w-3 h-3" /> : index + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
