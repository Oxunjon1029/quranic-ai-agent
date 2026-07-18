// Mic capture via AudioWorklet -> PCM16 mono @ 24kHz (OpenAI Realtime input format)
const workletCode = `
class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('pcm-processor', PcmProcessor);`;

export type StopCapture = () => void;

export async function startPcmCapture(
  onChunk: (pcm16: ArrayBuffer) => void,
): Promise<StopCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const ctx = new AudioContext({ sampleRate: 24000 });
  await ctx.audioWorklet.addModule(
    URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' })),
  );
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'pcm-processor');
  node.port.onmessage = (e: MessageEvent<Float32Array>) => {
    const f32 = e.data;
    const i16 = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      i16[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767)));
    }
    onChunk(i16.buffer);
  };
  src.connect(node);
  return () => {
    node.disconnect();
    src.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };
}
