import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { startPcmCapture, type StopCapture } from '../lib/pcm-capture';

export const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

export type WordStatus = 'pending' | 'correct' | 'mistake';

export interface ReciteWord {
  display: string;
  ayah: number;
  globalIndex: number;
  status: WordStatus;
}

export interface Correction {
  type: 'wrong-word' | 'skipped' | 'added' | 'stuck';
  ayah: number;
  wordIndex: number;
  expectedWords: string[];
  actual?: string;
  audioUrl: string;
}

export interface MistakeRecord {
  type: string;
  ayah: number;
  wordIndex: number;
  expected: string;
  actual?: string;
}

export interface Summary {
  mistakes: MistakeRecord[];
  wordsRead: number;
  wordsTotal: number;
}

interface TrackerEvent {
  kind: 'advance' | 'wrong-word' | 'skipped' | 'added';
  globalIndex?: number;
  fromIndex?: number;
  toIndex?: number;
  atIndex?: number;
  actual?: string;
}

interface ReciteState {
  surah: number | null;
  surahName: string;
  startAyah: number;
  words: ReciteWord[];
  pos: number;
  recording: boolean;
  connecting: boolean;
  transcript: string;
  correction: Correction | null;
  summary: Summary | null;
  error: string | null;
  start: (surah: number, surahName: string, startAyah: number) => Promise<void>;
  stop: () => Promise<void>;
  clearCorrection: () => void;
  reset: () => void;
}

let socket: Socket | null = null;
let stopCapture: StopCapture | null = null;
let correctionTimer: ReturnType<typeof setTimeout> | null = null;

export const useReciteStore = create<ReciteState>((set, get) => ({
  surah: null,
  surahName: '',
  startAyah: 1,
  words: [],
  pos: 0,
  recording: false,
  connecting: false,
  transcript: '',
  correction: null,
  summary: null,
  error: null,

  start: async (surah, surahName, startAyah) => {
    set({ connecting: true, error: null, summary: null, transcript: '', pos: 0 });
    try {
      socket = io(`${API_URL}/recite`, { transports: ['websocket'] });

      socket.on('transcript', ({ text }: { text: string }) => {
        set((s) => ({ transcript: (s.transcript + ' ' + text).slice(-400) }));
      });

      socket.on('events', ({ events, pos }: { events: TrackerEvent[]; pos: number }) => {
        set((s) => {
          const words = [...s.words];
          const mark = (i: number | undefined, status: WordStatus) => {
            if (i !== undefined && words[i]) words[i] = { ...words[i], status };
          };
          for (const e of events) {
            if (e.kind === 'advance') mark(e.globalIndex, 'correct');
            if (e.kind === 'wrong-word') mark(e.globalIndex, 'mistake');
            if (e.kind === 'skipped') {
              for (let i = e.fromIndex!; i < e.toIndex!; i++) mark(i, 'mistake');
            }
          }
          return { words, pos };
        });
      });

      socket.on('correction', (c: Correction) => {
        if (correctionTimer) clearTimeout(correctionTimer);
        set({ correction: c });
        correctionTimer = setTimeout(() => set({ correction: null }), 6000);
      });

      socket.on('error', ({ message }: { message: string }) => set({ error: message }));
      socket.on('connect_error', () => set({ error: 'Cannot reach the server' }));

      const ack: { sessionId: string; words: Omit<ReciteWord, 'status'>[] } = await socket
        .timeout(10000)
        .emitWithAck('session:start', { surah, startAyah });

      set({
        surah,
        surahName,
        startAyah,
        words: ack.words.map((w) => ({ ...w, status: 'pending' as WordStatus })),
      });

      stopCapture = await startPcmCapture((chunk) => socket?.emit('audio', chunk));
      set({ recording: true, connecting: false });
    } catch (err: any) {
      get().reset();
      set({ error: err?.message ?? 'Failed to start session' });
    }
  },

  stop: async () => {
    stopCapture?.();
    stopCapture = null;
    if (socket) {
      try {
        const summary: Summary = await socket.timeout(10000).emitWithAck('session:stop');
        set({ summary });
      } catch {
        set({ error: 'Could not fetch session summary' });
      }
      socket.disconnect();
      socket = null;
    }
    set({ recording: false, correction: null });
  },

  clearCorrection: () => set({ correction: null }),

  reset: () => {
    stopCapture?.();
    stopCapture = null;
    socket?.disconnect();
    socket = null;
    set({
      surah: null,
      surahName: '',
      startAyah: 1,
      words: [],
      pos: 0,
      recording: false,
      connecting: false,
      transcript: '',
      correction: null,
      summary: null,
      error: null,
    });
  },
}));
