// Hook for real-time speech-to-text transcription

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments: TranscriptionSegment[];
  words?: Array<{ word: string; start: number; end: number }>;
}

export interface UseTranscriptionOptions {
  onTranscript?: (result: TranscriptionResult) => void;
  onPartialTranscript?: (text: string) => void;
  language?: string;
}

export function useTranscription(options: UseTranscriptionOptions = {}) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);

  const accumulatedTranscriptRef = useRef<string>('');
  const accumulatedSegmentsRef = useRef<TranscriptionSegment[]>([]);

  // Transcribe audio blob
  const transcribeAudio = useCallback(async (
    audioBlob: Blob | string // Blob or base64 string
  ): Promise<TranscriptionResult | null> => {
    setError(null);
    setIsTranscribing(true);

    const startTime = performance.now();

    try {
      let base64Audio: string;

      if (typeof audioBlob === 'string') {
        base64Audio = audioBlob;
      } else {
        // Convert blob to base64
        base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
      }

      console.log('[Transcription] Sending audio to Whisper...');

      const { data, error: fnError } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          audio: base64Audio,
          language: options.language,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const result: TranscriptionResult = {
        text: data.text || '',
        language: data.language,
        duration: data.duration,
        segments: data.segments || [],
        words: data.words || [],
      };

      // Update accumulated transcript
      if (result.text) {
        accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? ' ' : '') + result.text;
        setTranscript(accumulatedTranscriptRef.current);
      }

      if (result.segments.length > 0) {
        accumulatedSegmentsRef.current = [...accumulatedSegmentsRef.current, ...result.segments];
        setSegments(accumulatedSegmentsRef.current);
      }

      const elapsed = performance.now() - startTime;
      setProcessingTime(elapsed);

      console.log('[Transcription] Complete in', elapsed.toFixed(0), 'ms:', result.text?.substring(0, 50));

      if (options.onTranscript) {
        options.onTranscript(result);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transcription failed';
      setError(errorMessage);
      console.error('[Transcription] Error:', err);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, [options]);

  // Analyze full call transcript for fraud
  const analyzeTranscript = useCallback(async (
    fullTranscript: string,
    audioAnalysis?: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> => {
    try {
      console.log('[Transcription] Analyzing transcript for fraud...');

      const { data, error: fnError } = await supabase.functions.invoke('analyze-call', {
        body: { 
          transcript: fullTranscript,
          audioAnalysis,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('[Transcription] Analysis complete. Risk level:', data.riskLevel);
      return data;
    } catch (err) {
      console.error('[Transcription] Analysis error:', err);
      return null;
    }
  }, []);

  // Reset transcript state
  const reset = useCallback(() => {
    accumulatedTranscriptRef.current = '';
    accumulatedSegmentsRef.current = [];
    setTranscript('');
    setSegments([]);
    setError(null);
    setProcessingTime(0);
  }, []);

  // Get current accumulated transcript
  const getFullTranscript = useCallback(() => {
    return accumulatedTranscriptRef.current;
  }, []);

  return {
    isTranscribing,
    transcript,
    segments,
    error,
    processingTime,
    transcribeAudio,
    analyzeTranscript,
    reset,
    getFullTranscript,
  };
}
