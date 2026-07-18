import { create } from 'zustand';
import { SURAHS, type Surah } from '../data/surahs';

export interface WordResult {
  word: string;
  expected: string;
  status: 'correct' | 'incorrect' | 'missing' | 'extra';
}

interface AppState {
  // Session
  sessionStarted: boolean;
  selectedSurah: Surah | null;
  currentAyahIndex: number;

  // Recording
  isRecording: boolean;
  isProcessing: boolean;

  // Results
  transcript: string;
  accuracy: number;
  wordResults: WordResult[];
  error: string | null;

  // Imam help
  showingNextAyah: boolean;

  // Actions
  selectSurah: (surah: Surah) => void;
  startSession: () => void;
  setRecording: (recording: boolean) => void;
  setProcessing: (processing: boolean) => void;
  updateResults: (transcript: string, accuracy: number, words: WordResult[]) => void;
  nextAyah: () => void;
  showNextAyah: () => void;    // Imam help — peek at next ayah
  hideNextAyah: () => void;
  setError: (error: string | null) => void;
  goBack: () => void;          // Back to surah selection
  reset: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  sessionStarted: false,
  selectedSurah: null,
  currentAyahIndex: 0,
  isRecording: false,
  isProcessing: false,
  transcript: '',
  accuracy: 0,
  wordResults: [],
  error: null,
  showingNextAyah: false,

  selectSurah: (surah) => set({ selectedSurah: surah }),

  startSession: () => {
    const { selectedSurah } = get();
    if (!selectedSurah) return;
    set({
      sessionStarted: true,
      currentAyahIndex: 0,
      transcript: '',
      accuracy: 0,
      wordResults: [],
      error: null,
      showingNextAyah: false,
    });
  },

  setRecording: (isRecording) => set({ isRecording }),
  setProcessing: (isProcessing) => set({ isProcessing }),

  updateResults: (transcript, accuracy, wordResults) =>
    set({ transcript, accuracy, wordResults, error: null }),

  nextAyah: () => {
    const { currentAyahIndex, selectedSurah } = get();
    if (!selectedSurah) return;
    const next = currentAyahIndex + 1;
    if (next < selectedSurah.ayahs.length) {
      set({
        currentAyahIndex: next,
        transcript: '',
        accuracy: 0,
        wordResults: [],
        error: null,
        showingNextAyah: false,
      });
    }
  },

  showNextAyah: () => set({ showingNextAyah: true }),
  hideNextAyah: () => set({ showingNextAyah: false }),

  setError: (error) => set({ error }),

  goBack: () => set({
    sessionStarted: false,
    selectedSurah: null,
    currentAyahIndex: 0,
    transcript: '',
    accuracy: 0,
    wordResults: [],
    error: null,
    showingNextAyah: false,
  }),

  reset: () => set({
    sessionStarted: false,
    selectedSurah: null,
    currentAyahIndex: 0,
    isRecording: false,
    isProcessing: false,
    transcript: '',
    accuracy: 0,
    wordResults: [],
    error: null,
    showingNextAyah: false,
  }),
}));

// Re-export for convenience
export { SURAHS };
export type { Surah };
