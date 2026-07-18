import { WebSocket } from 'ws';

/** Streams PCM16 audio to OpenAI Realtime transcription and surfaces Arabic transcript deltas. */
export class OpenAiTranscriber {
  private ws: WebSocket | null = null;
  private stopped = false;

  constructor(
    private readonly onDelta: (text: string) => void,
    private readonly onError: (err: Error) => void,
  ) {}

  start(): Promise<void> {
    this.stopped = false;
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription', {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      });
      this.ws.on('open', () => {
        // GA realtime API: unified session.update with a transcription-type session
        this.ws!.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              type: 'transcription',
              audio: {
                input: {
                  format: { type: 'audio/pcm', rate: 24000 },
                  transcription: { model: 'gpt-4o-transcribe', language: 'ar' },
                  turn_detection: { type: 'server_vad', silence_duration_ms: 400 },
                },
              },
            },
          }),
        );
        this.attachReconnect();
        resolve();
      });
      this.ws.on('message', (raw) => {
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        if (msg.type === 'conversation.item.input_audio_transcription.delta' && msg.delta) {
          this.onDelta(msg.delta);
        }
        if (msg.type === 'conversation.item.input_audio_transcription.completed' && msg.transcript) {
          // completed events sometimes carry words the deltas missed; tracker dedupes by position
        }
        if (msg.type === 'error') this.onError(new Error(msg.error?.message ?? 'openai error'));
      });
      this.ws.on('error', (e) => {
        this.onError(e as Error);
        reject(e as Error);
      });
    });
  }

  /** Reconnect once on unexpected close so the session survives an OpenAI WS drop. */
  private attachReconnect() {
    this.ws?.on('close', (code) => {
      if (!this.stopped && code !== 1000) {
        this.ws = null;
        this.start().catch((e) => this.onError(e));
      }
    });
  }

  sendAudio(chunk: Buffer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({ type: 'input_audio_buffer.append', audio: chunk.toString('base64') }),
      );
    }
  }

  stop() {
    this.stopped = true;
    this.ws?.close(1000);
    this.ws = null;
  }
}
