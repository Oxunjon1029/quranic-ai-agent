import React, { useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useSalahStore';
import { cn } from '../lib/utils';

export default function AudioRecorder() {
  const {
    isRecording, isProcessing, selectedSurah, currentAyahIndex,
    setRecording, setProcessing, updateResults, setError,
  } = useAppStore();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  if (!selectedSurah) return null;
  const expectedText = selectedSurah.ayahs[currentAyahIndex];

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setProcessing(true);

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('expectedText', expectedText);

        try {
          const res = await fetch('http://localhost:3000/speech/check', {
            method: 'POST',
            body: formData,
          });
          const result = await res.json();
          if (result.transcribedText) {
            updateResults(
              result.transcribedText,
              result.accuracy,
              result.words || []
            );
          } else if (result.error) {
            setError(result.error);
          }
        } catch (err) {
          setError('Could not connect to the server. Make sure the backend is running on port 3000.');
        } finally {
          setProcessing(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      setError('Microphone access is required. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
          </>
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={cn(
            "relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 z-10",
            isRecording
              ? "bg-destructive hover:bg-destructive/90 scale-110"
              : isProcessing
              ? "bg-muted cursor-not-allowed"
              : "bg-primary hover:bg-primary/90 hover:scale-105 hover:shadow-primary/30 hover:shadow-2xl"
          )}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          ) : isRecording ? (
            <Square className="w-7 h-7 text-white fill-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
      </div>

      <p className="text-sm text-muted-foreground font-medium tracking-wide">
        {isProcessing
          ? 'Checking your pronunciation...'
          : isRecording
          ? 'Reciting... Tap to stop'
          : 'Tap to recite this ayah'}
      </p>
    </div>
  );
}
