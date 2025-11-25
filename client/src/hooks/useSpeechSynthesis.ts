import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechSynthesisOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

interface UseSpeechSynthesisReturn {
  speak: (text: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
  currentVoice: SpeechSynthesisVoice | null;
  error: string | null;
}

export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!isSupported) {
      setError('Speech synthesis is not supported in this browser');
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      if (availableVoices.length > 0 && !currentVoice) {
        const defaultVoice = availableVoices.find(v => v.default) || 
                            availableVoices.find(v => v.lang.startsWith('en')) ||
                            availableVoices[0];
        setCurrentVoice(defaultVoice);
      }
    };

    loadVoices();
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported) {
      setError('Speech synthesis is not supported');
      return;
    }

    if (!text.trim()) {
      setError('Cannot speak empty text');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;
      utterance.lang = options.lang ?? 'en-US';
      
      if (currentVoice) {
        utterance.voice = currentVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setError(null);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        setIsPaused(false);
        setError(`Speech error: ${event.error}`);
      };

      utterance.onpause = () => {
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setIsSpeaking(false);
    }
  }, [isSupported, options.rate, options.pitch, options.volume, options.lang, currentVoice]);

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isSupported]);

  const setVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    setCurrentVoice(voice);
  }, []);

  return {
    speak,
    cancel,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    setVoice,
    currentVoice,
    error,
  };
}
