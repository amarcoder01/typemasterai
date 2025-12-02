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
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchdogIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const clearIntervals = useCallback(() => {
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }
    if (watchdogIntervalRef.current) {
      clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isSupported) {
      setError('Speech synthesis is not supported in this browser');
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const validVoices = availableVoices.filter(v => v.voiceURI && v.voiceURI.trim() !== '');
      setVoices(validVoices);
      
      if (validVoices.length > 0 && !currentVoice) {
        const englishVoices = validVoices.filter(v => v.lang.startsWith('en'));
        
        const premiumVoice = englishVoices.find(v => 
          v.name.toLowerCase().includes('premium') ||
          v.name.toLowerCase().includes('enhanced') ||
          v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('neural')
        );
        
        const googleVoice = englishVoices.find(v => 
          v.name.toLowerCase().includes('google') && 
          (v.lang === 'en-US' || v.lang === 'en-GB')
        );
        
        const microsoftVoice = englishVoices.find(v => 
          v.name.toLowerCase().includes('microsoft') &&
          (v.name.toLowerCase().includes('zira') || 
           v.name.toLowerCase().includes('david') ||
           v.name.toLowerCase().includes('mark'))
        );
        
        const localEnglishVoice = englishVoices.find(v => v.localService);
        const usEnglishVoice = englishVoices.find(v => v.lang === 'en-US');
        const anyEnglishVoice = englishVoices[0];
        const defaultVoice = validVoices.find(v => v.default);
        
        const selectedVoice = premiumVoice || googleVoice || microsoftVoice || 
                              localEnglishVoice || usEnglishVoice || anyEnglishVoice || 
                              defaultVoice || validVoices[0];
        setCurrentVoice(selectedVoice);
      }
    };

    loadVoices();
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      clearIntervals();
      window.speechSynthesis.cancel();
    };
  }, [isSupported, clearIntervals]);

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
      clearIntervals();
      window.speechSynthesis.cancel();
      
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate ?? 1.0;
        utterance.pitch = options.pitch ?? 1.0;
        utterance.volume = options.volume ?? 1.0;
        utterance.lang = options.lang ?? 'en-US';
        
        if (currentVoice) {
          utterance.voice = currentVoice;
        }

        let speechStarted = false;
        let lastBoundaryTime = Date.now();

        utterance.onstart = () => {
          speechStarted = true;
          lastBoundaryTime = Date.now();
          setIsSpeaking(true);
          setIsPaused(false);
          setError(null);

          resumeIntervalRef.current = setInterval(() => {
            if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
              window.speechSynthesis.pause();
              window.speechSynthesis.resume();
            }
          }, 5000);

          watchdogIntervalRef.current = setInterval(() => {
            if (!window.speechSynthesis.speaking && speechStarted) {
              clearIntervals();
              setIsSpeaking(false);
              setIsPaused(false);
            }
          }, 1000);
        };

        utterance.onboundary = () => {
          lastBoundaryTime = Date.now();
        };

        utterance.onend = () => {
          clearIntervals();
          setIsSpeaking(false);
          setIsPaused(false);
        };

        utterance.onerror = (event) => {
          clearIntervals();
          
          if (event.error === 'interrupted' || event.error === 'canceled') {
            setIsSpeaking(false);
            setIsPaused(false);
            return;
          }
          
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

        setTimeout(() => {
          if (!speechStarted && window.speechSynthesis.speaking === false) {
            window.speechSynthesis.cancel();
            setTimeout(() => {
              window.speechSynthesis.speak(utterance);
            }, 100);
          }
        }, 250);

      }, 50);

    } catch (err) {
      clearIntervals();
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setIsSpeaking(false);
    }
  }, [isSupported, options.rate, options.pitch, options.volume, options.lang, currentVoice, clearIntervals]);

  const cancel = useCallback(() => {
    if (isSupported) {
      clearIntervals();
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isSupported, clearIntervals]);

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
