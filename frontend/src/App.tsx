import React, { useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import AudioRecorder from './components/AudioRecorder';
import LiveTranscript from './components/LiveTranscript';
import AyahTracker from './components/SalahStepTracker';
import SurahSelector from './components/SurahSelector';
import { useAppStore } from './store/useSalahStore';
import { Button } from './components/ui/button';
import { ArrowRight, ArrowLeft, RotateCcw, BookOpenCheck, Sparkles, ChevronLeft } from 'lucide-react';

export default function App() {
  const {
    sessionStarted,
    selectedSurah,
    currentAyahIndex,
    accuracy,
    wordResults,
    isRecording,
    isProcessing,
    nextAyah,
    goBack,
    reset,
  } = useAppStore();

  const isLastAyah = selectedSurah ? currentAyahIndex === selectedSurah.ayahs.length - 1 : false;
  const canAdvance = wordResults.length > 0 && accuracy >= 60 && !isRecording && !isProcessing;

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
    } catch (e) {
      // Not running inside Telegram
    }
  }, []);

  // Welcome screen — surah selection
  if (!sessionStarted) {
    return (
      <div className="min-h-screen flex flex-col px-4 py-8 max-w-lg mx-auto">
        {/* Decorative background */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="text-center mb-8 animate-fade-in-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookOpenCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Quranic Recitation Assistant
          </h1>
          <p className="text-sm text-muted-foreground">
            Check your pronunciation • Get instant feedback • Never forget the next ayah
          </p>
        </div>

        <SurahSelector />

        <p className="mt-8 text-center text-[10px] text-muted-foreground/40">
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </p>
      </div>
    );
  }

  // Active session
  return (
    <div className="min-h-screen flex flex-col px-4 py-4 max-w-lg mx-auto">
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Header with back button */}
      <header className="flex items-center gap-3 mb-3 animate-fade-in-up">
        <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">
            {selectedSurah?.arabicName} — {selectedSurah?.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Ayah {currentAyahIndex + 1} of {selectedSurah?.ayahs.length}
          </p>
        </div>
      </header>

      {/* Ayah progress tracker */}
      <AyahTracker />

      {/* Main content */}
      <main className="flex-1 flex flex-col gap-5 mt-3">
        <LiveTranscript />

        <div className="flex flex-col items-center gap-3">
          <AudioRecorder />
        </div>
      </main>

      {/* Bottom actions */}
      <footer className="pt-5 pb-2 space-y-2 animate-fade-in-up">
        {canAdvance && (
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={isLastAyah ? goBack : nextAyah}
          >
            {isLastAyah ? (
              <>
                <RotateCcw className="w-4 h-4" />
                Surah Complete — Choose Another
              </>
            ) : (
              <>
                Next Ayah
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        )}

        {!isLastAyah && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground text-xs"
            onClick={nextAyah}
            disabled={isRecording || isProcessing}
          >
            Skip to next ayah →
          </Button>
        )}
      </footer>
    </div>
  );
}
