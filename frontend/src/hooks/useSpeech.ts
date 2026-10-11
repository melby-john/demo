import { useState, useEffect, useCallback, useRef } from 'react';

// Declare types for Web Speech API SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeech() {
  // TTS State
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const isTtsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // STT State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [sttError, setSttError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSttSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize TTS voices
  useEffect(() => {
    if (!isTtsSupported) return;

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      if (available.length > 0 && !selectedVoice) {
        // Prefer natural English voice or default
        const defaultVoice =
          available.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))) ||
          available.find(v => v.lang.startsWith('en')) ||
          available[0];
        setSelectedVoice(defaultVoice);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isTtsSupported]);

  // Speak text using TTS
  const speak = useCallback(
    (text: string, customVoice?: SpeechSynthesisVoice, customRate?: number) => {
      if (!isTtsSupported || !text.trim()) return;

      try {
        window.speechSynthesis.cancel(); // Stop any pending utterances
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = customVoice || selectedVoice;
        utterance.rate = customRate ?? speechRate;
        utterance.pitch = speechPitch;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
          console.warn('Speech synthesis utterance error:', e);
          setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('SpeechSynthesis error:', err);
        setIsSpeaking(false);
      }
    },
    [isTtsSupported, selectedVoice, speechRate, speechPitch]
  );

  const stopSpeaking = useCallback(() => {
    if (isTtsSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isTtsSupported]);

  // Start Speech-to-Text
  const startListening = useCallback(() => {
    if (!isSttSupported) {
      setSttError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    setSttError(null);
    try {
      const SpeechRecognitionClass =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i][0].transcript;
          currentTranscript += item;
        }
        setTranscript(prev => (prev ? `${prev} ${currentTranscript.trim()}` : currentTranscript.trim()));
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSttError('Microphone permission denied. Please allow microphone access in your browser.');
        } else if (event.error === 'no-speech') {
          // Normal timeout if user was quiet
        } else {
          setSttError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setSttError(err.message || 'Failed to start speech recognition.');
      setIsListening(false);
    }
  }, [isSttSupported]);

  // Stop Speech-to-Text
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setSttError(null);
  }, []);

  return {
    // TTS
    isTtsSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    speechPitch,
    setSpeechPitch,
    isSpeaking,
    speak,
    stopSpeaking,

    // STT
    isSttSupported,
    isListening,
    transcript,
    setTranscript,
    sttError,
    startListening,
    stopListening,
    clearTranscript
  };
}
