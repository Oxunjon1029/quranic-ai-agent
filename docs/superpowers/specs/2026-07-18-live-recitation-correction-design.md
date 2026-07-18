# Live Recitation Correction — Web v1 Design

**Date:** 2026-07-18
**Status:** Approved

## Purpose

Help imams during Quran recitation (Ramadan taraweeh, daily prayers). The imam selects a surah, taps record, and recites. The app follows along word-by-word and, when it detects a mistake or a long hesitation, corrects in real time: it highlights the error on screen and plays the correct words in a qari's voice — acting like a human prompter (muqri).

## Decisions

| Decision | Choice |
|---|---|
| ASR | OpenAI Realtime transcription (`gpt-4o-transcribe`, language `ar`), streamed |
| Passage tracking | Imam selects surah (and optional start ayah) before starting |
| Error scope (v1) | Wrong word, skipped word(s), added word(s), stuck/hesitation (~4s silence mid-ayah) |
| Correction UX | On-screen highlight + qari audio of the correct ayah segment (everyayah.com per-ayah mp3s) |
| Audio flow | Browser mic → WebSocket → NestJS → OpenAI Realtime; corrections pushed back on same socket |
| Data | Quran text bundled as JSON (Tanzil Uthmani + normalized); Prisma + SQLite for Session/Mistake history |
| Auth | None in v1 (single-user local) |

## Architecture

```
Browser mic (AudioWorklet → PCM16 chunks)
   │ WebSocket (socket.io)
   ▼
NestJS gateway ──► OpenAI Realtime transcription (ar)
   │ transcript deltas
   ▼
Matching engine (position tracking vs selected surah)
   │ corrections {type, expectedWords, ayah, wordIndex}
   ▼
Browser: word highlighting + correction banner + qari audio playback
```

## Components

### Backend (NestJS, existing skeleton)
- **RecitationGateway** (socket.io): session lifecycle (`start` with surah/ayah, `audio` chunks, `stop`), relays audio to OpenAI Realtime WS, pushes `transcript`, `position`, `correction`, `summary` events.
- **Matching engine** (extends `matching.util.ts`):
  - Arabic normalization: strip diacritics/tatweel, normalize alef/hamza/ta-marbuta forms.
  - Word-by-word position tracker with a small lookahead window to classify: correct, wrong word, skipped word(s), added word(s).
  - Silence timer: ~4s without progress mid-ayah → `stuck` correction prompting the next words.
- **Quran text service**: loads bundled Tanzil JSON (Uthmani display text + normalized matching text, word-segmented).
- **Persistence** (Prisma + SQLite): `Session` (surah, ayah range, timestamps) and `Mistake` (type, ayah, word index, expected/actual) for the end-of-session summary and history.

### Frontend (React/Vite/Tailwind, existing skeleton)
- Surah/ayah selector (existing `SurahSelector`).
- Recorder: AudioWorklet capturing PCM16 @ 24kHz, streamed via socket.io client.
- Quran view: word-level rendering with states — recited (green), mistake (red), current position (pulse).
- Correction banner + qari audio playback (everyayah.com per-ayah mp3, seek not required — play the ayah from the corrected word's segment or full ayah).
- Session summary screen: mistake list with replay; history from backend.

## Error handling
- OpenAI WS drop: auto-reconnect, notify client with a non-blocking toast; session continues once reconnected.
- Mic permission denied / unsupported browser: clear error state on recorder.
- Qari audio fetch failure: fall back to visual-only correction for that event.

## Testing
- Unit tests: normalization and matching engine — correct flow, wrong word, skip, addition, resume-after-correction, stuck detection (Jest, existing config).
- Manual E2E: live mic recitation against a short surah.

## Out of scope (later phases)
Tajweed/pronunciation analysis, auto-detecting the passage, Telegram bot (telegraf dep already present), iOS/Android apps, salah-mode integration, auth/multi-user.
