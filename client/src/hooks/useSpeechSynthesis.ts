import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechSynthesisOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  useOpenAI?: boolean;
  openAIVoice?: string;
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
  isUsingOpenAI: boolean;
  setUseOpenAI: (use: boolean) => void;
  openAIVoices: { id: string; name: string }[];
  setOpenAIVoice: (voice: string) => void;
  currentOpenAIVoice: string;
}

const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy (Neutral)' },
  { id: 'echo', name: 'Echo (Male)' },
  { id: 'fable', name: 'Fable (British)' },
  { id: 'onyx', name: 'Onyx (Deep Male)' },
  { id: 'nova', name: 'Nova (Female)' },
  { id: 'shimmer', name: 'Shimmer (Soft Female)' },
];

const OPENAI_VOICE_STORAGE_KEY = 'dictation-openai-voice';
const USE_OPENAI_STORAGE_KEY = 'dictation-use-openai';

export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUsingOpenAI, setIsUsingOpenAI] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(USE_OPENAI_STORAGE_KEY);
      return stored ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [currentOpenAIVoice, setCurrentOpenAIVoice] = useState(() => {
    return localStorage.getItem(OPENAI_VOICE_STORAGE_KEY) || 'nova';
  });
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchdogIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voicePollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (voicePollingIntervalRef.current) {
      clearInterval(voicePollingIntervalRef.current);
      voicePollingIntervalRef.current = null;
    }
  }, []);

  const setUseOpenAI = useCallback((use: boolean) => {
    setIsUsingOpenAI(use);
    localStorage.setItem(USE_OPENAI_STORAGE_KEY, use.toString());
  }, []);

  const setOpenAIVoice = useCallback((voice: string) => {
    setCurrentOpenAIVoice(voice);
    localStorage.setItem(OPENAI_VOICE_STORAGE_KEY, voice);
  }, []);

  useEffect(() => {
    if (!isSupported) {
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
    if (!currentVoice || voices.length === 0) {
      voicePollingIntervalRef.current = setInterval(() => {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          loadVoices();
          clearIntervals();
        }
      }, 300);
      setTimeout(() => {
        if (voicePollingIntervalRef.current) {
          clearIntervals();
        }
      }, 3000);
    }

    return () => {
      clearIntervals();
      window.speechSynthesis.cancel();
    };
  }, [isSupported, clearIntervals]);

  const speakWithOpenAI = useCallback(async (text: string): Promise<boolean> => {
    try {
      setIsSpeaking(true);
      setError(null);
      const url = `/api/dictation/tts-stream?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(currentOpenAIVoice)}&speed=${encodeURIComponent(String(options.rate ?? 1.0))}`;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      const startedPromise = new Promise<boolean>((resolve) => {
        audio.onplaying = () => resolve(true);
        audio.onerror = () => resolve(false);
      });
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 4000);
      });
      await audio.play();
      const ok = await Promise.race([startedPromise, timeoutPromise]);
      if (!ok) {
        setIsSpeaking(false);
      }
      return ok;
    } catch (err) {
      setIsSpeaking(false);
      return false;
    }
  }, [currentOpenAIVoice, options.rate]);

  const speakWithBrowser = useCallback((text: string) => {
    if (!isSupported) {
      setError('Speech synthesis is not supported');
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

        utterance.onstart = () => {
          speechStarted = true;
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

        utterance.onpause = () => setIsPaused(true);
        utterance.onresume = () => setIsPaused(false);

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

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) {
      setError('Cannot speak empty text');
      return;
    }

    if (isUsingOpenAI) {
      const success = await speakWithOpenAI(text);
      if (!success) {
        console.log('OpenAI TTS failed, falling back to browser speech');
        speakWithBrowser(text);
      }
    } else {
      speakWithBrowser(text);
    }
  }, [isUsingOpenAI, speakWithOpenAI, speakWithBrowser]);

  const cancel = useCallback(() => {
    clearIntervals();
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
    setIsPaused(false);
  }, [isSupported, clearIntervals]);

  const setVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    setCurrentVoice(voice);
  }, []);

  return {
    speak,
    cancel,
    isSpeaking,
    isPaused,
    isSupported: isSupported || isUsingOpenAI,
    voices,
    setVoice,
    currentVoice,
    error,
    isUsingOpenAI,
    setUseOpenAI,
    openAIVoices: OPENAI_VOICES,
    setOpenAIVoice,
    currentOpenAIVoice,
  };
}
