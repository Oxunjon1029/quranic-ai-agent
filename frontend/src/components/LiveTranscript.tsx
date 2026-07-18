import React from 'react';
import { useAppStore } from '../store/useSalahStore';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { BookOpen, AlertCircle, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export default function LiveTranscript() {
  const {
    transcript, selectedSurah, currentAyahIndex, accuracy,
    wordResults, isRecording, isProcessing, error,
    showingNextAyah, showNextAyah, hideNextAyah,
  } = useAppStore();

  if (!selectedSurah) return null;

  const currentAyah = selectedSurah.ayahs[currentAyahIndex];
  const nextAyah = selectedSurah.ayahs[currentAyahIndex + 1];
  const hasResults = wordResults.length > 0 && !isRecording && !isProcessing;

  return (
    <Card className="w-full glass animate-fade-in-up">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="w-4 h-4 text-primary" />
          {selectedSurah.arabicName} — Ayah {currentAyahIndex + 1}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Expected ayah */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">
            Expected Recitation
          </p>
          <div className="p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/10">
            <p className="text-xl font-arabic text-right leading-[2.4] text-foreground/90" dir="rtl">
              {currentAyah}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Your recitation with word-by-word highlighting */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Your Pronunciation
            </p>
            {hasResults && (
              <Badge variant={accuracy >= 80 ? "success" : "destructive"}>
                {accuracy.toFixed(0)}% Accuracy
              </Badge>
            )}
          </div>

          <div className={cn(
            "p-4 rounded-xl min-h-[4rem] transition-all duration-300",
            hasResults
              ? accuracy >= 80
                ? "bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30"
                : "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30"
              : "bg-muted/50 border border-transparent"
          )}>
            {isRecording ? (
              <div className="flex items-center gap-2 text-primary">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm font-medium">Listening to your recitation...</span>
              </div>
            ) : isProcessing ? (
              <div className="h-6 w-full rounded bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer" />
            ) : hasResults ? (
              /* Word-by-word results */
              <div className="flex flex-wrap gap-1.5 justify-end" dir="rtl">
                {wordResults.map((wr, i) => (
                  <span
                    key={i}
                    className={cn(
                      "inline-block px-1.5 py-0.5 rounded font-arabic text-lg leading-relaxed transition-all",
                      wr.status === 'correct' && "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20",
                      wr.status === 'incorrect' && "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 underline decoration-wavy decoration-red-400",
                      wr.status === 'missing' && "text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 line-through",
                      wr.status === 'extra' && "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 italic",
                    )}
                    title={wr.status === 'incorrect' ? `Expected: ${wr.expected}` : wr.status}
                  >
                    {wr.status === 'missing' ? wr.expected : wr.word}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">
                Tap the microphone to start reciting this ayah...
              </p>
            )}
          </div>

          {/* Word-level legend */}
          {hasResults && (
            <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Correct</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Mispronounced</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> Missing</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Extra</span>
            </div>
          )}

          {/* Feedback message */}
          {hasResults && (
            <p className={cn(
              "mt-3 text-sm font-medium animate-fade-in-up",
              accuracy >= 90 ? "text-emerald-600 dark:text-emerald-400" :
              accuracy >= 70 ? "text-amber-600 dark:text-amber-400" :
              "text-red-600 dark:text-red-400"
            )}>
              {accuracy >= 90 ? '✨ Excellent tajweed! Your pronunciation is very accurate.' :
               accuracy >= 70 ? '👍 Good recitation. Focus on the highlighted words.' :
               '🔄 Keep practicing. Review the red-highlighted words carefully.'}
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm animate-fade-in-up">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Imam Help — Next Ayah Preview */}
        {nextAyah && (
          <div className="pt-2 border-t border-border">
            {showingNextAyah ? (
              <div className="animate-fade-in-up">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-primary font-medium flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Next Ayah
                  </p>
                  <Button variant="ghost" size="sm" onClick={hideNextAyah} className="text-xs h-6 px-2">
                    Hide
                  </Button>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="font-arabic text-lg text-primary/80 text-right leading-[2.2]" dir="rtl">
                    {nextAyah}
                  </p>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={showNextAyah}
                className="w-full text-muted-foreground gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                Forgot what's next? Tap to see the next ayah
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
