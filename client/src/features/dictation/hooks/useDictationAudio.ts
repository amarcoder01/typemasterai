import { useCallback, useEffect, useRef } from 'react';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { getSpeedRate } from '@shared/dictation-utils';
import { getSavedVoice, saveVoiceSelection } from '../utils/persistence';

interface UseDictationAudioOptions {
  speedLevel: string;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onSpeechError?: (error: string) => void;
}

interface UseDictationAudioReturn {
  speak: (text: string) => void;
  cancel: () => void;
  replay: (text: string) => void;
  isSpeaking: boolean;
  isSupported: boolean;
  error: string | null;
  
  // Voice management
  voices: SpeechSynthesisVoice[];
  englishVoices: SpeechSynthesisVoice[];
  currentVoice: SpeechSynthesisVoice | null;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
  handleVoiceChange: (voiceUri: string) => void;
  
  // OpenAI TTS
  isUsingOpenAI: boolean;
  setUseOpenAI: (use: boolean) => void;
  openAIVoices: { id: string; name: string }[];
  currentOpenAIVoice: string;
  setOpenAIVoice: (voice: string) => void;
  
  // Current rate
  currentRate: number;
}

/**
 * Hook for managing dictation audio with proper cleanup
 * Handles both browser TTS and OpenAI TTS
 */
export function useDictationAudio(options: UseDictationAudioOptions): UseDictationAudioReturn {
  const { speedLevel, onSpeechStart, onSpeechEnd, onSpeechError } = options;
  
  const currentRate = getSpeedRate(speedLevel);
  const isMountedRef = useRef(true);
  const speechCallbacksRef = useRef({ onSpeechStart, onSpeechEnd, onSpeechError });
  
  // Update refs when callbacks change
  useEffect(() => {
    speechCallbacksRef.current = { onSpeechStart, onSpeechEnd, onSpeechError };
  }, [onSpeechStart, onSpeechEnd, onSpeechError]);
  
  const {
    speak: baseSpeek,
    cancel,
    isSpeaking,
    isSupported,
    error: speechError,
    voices,
    setVoice,
    currentVoice,
    isUsingOpenAI,
    setUseOpenAI,
    openAIVoices,
    setOpenAIVoice,
    currentOpenAIVoice,
  } = useSpeechSynthesis({
    rate: currentRate,
    lang: 'en-US',
  });
  
  // Filter English voices
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  
  // Handle voice change with persistence
  const handleVoiceChange = useCallback((voiceUri: string) => {
    const selectedVoice = voices.find(v => v.voiceURI === voiceUri);
    if (selectedVoice) {
      setVoice(selectedVoice);
      saveVoiceSelection(voiceUri);
    }
  }, [voices, setVoice]);
  
  // Restore saved voice on mount
  useEffect(() => {
    if (voices.length > 0) {
      const savedVoiceURI = getSavedVoice();
      if (savedVoiceURI) {
        const savedVoice = voices.find(v => v.voiceURI === savedVoiceURI);
        if (savedVoice) {
          setVoice(savedVoice);
        }
      }
    }
  }, [voices, setVoice]);
  
  // Track speaking state changes
  const wasSpeakingRef = useRef(false);
  useEffect(() => {
    if (isSpeaking && !wasSpeakingRef.current) {
      // Speech started
      speechCallbacksRef.current.onSpeechStart?.();
    } else if (!isSpeaking && wasSpeakingRef.current) {
      // Speech ended
      speechCallbacksRef.current.onSpeechEnd?.();
    }
    wasSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);
  
  // Track errors
  useEffect(() => {
    if (speechError) {
      speechCallbacksRef.current.onSpeechError?.(speechError);
    }
  }, [speechError]);
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancel();
    };
  }, [cancel]);
  
  // Speak with safety check
  const speak = useCallback((text: string) => {
    if (!isMountedRef.current) return;
    baseSpeek(text);
  }, [baseSpeek]);
  
  // Replay with delay
  const replay = useCallback((text: string) => {
    if (!isMountedRef.current) return;
    cancel();
    // Small delay to ensure clean state
    setTimeout(() => {
      if (isMountedRef.current) {
        baseSpeek(text);
      }
    }, 200);
  }, [cancel, baseSpeek]);
  
  return {
    speak,
    cancel,
    replay,
    isSpeaking,
    isSupported,
    error: speechError,
    voices,
    englishVoices,
    currentVoice,
    setVoice,
    handleVoiceChange,
    isUsingOpenAI,
    setUseOpenAI,
    openAIVoices,
    currentOpenAIVoice,
    setOpenAIVoice,
    currentRate,
  };
}
