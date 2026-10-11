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
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [latestFinalPhrase, setLatestFinalPhrase] = useState<{ text: string; timestamp: number } | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningActiveRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<any>(null);

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

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      isListeningActiveRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  // Internal helper to spawn fresh recognition instance
  const initRecognition = useCallback(() => {
    if (!isSttSupported) return null;

    try {
      const SpeechRecognitionClass =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSttError(null);
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalizedText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            finalizedText += ' ' + text;
          } else {
            interimText += ' ' + text;
          }
        }

        const cleanFinal = finalizedText.trim();
        const cleanInterim = interimText.trim();

        if (cleanFinal) {
          setLatestFinalPhrase({ text: cleanFinal, timestamp: Date.now() });
          setFinalTranscript(prev => (prev ? `${prev} ${cleanFinal}` : cleanFinal));
        }

        if (cleanInterim) {
          setTranscript(cleanInterim);
        } else if (cleanFinal) {
          setTranscript(cleanFinal);
        }
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        console.warn('Speech recognition status/error:', err);

        if (err === 'not-allowed' || err === 'service-not-allowed') {
          isListeningActiveRef.current = false;
          setIsListening(false);
          setSttError('Microphone access denied. Please click the microphone/lock icon in your browser address bar to allow audio.');
        } else if (err === 'audio-capture') {
          isListeningActiveRef.current = false;
          setIsListening(false);
          setSttError('No microphone detected. Please plug in a microphone or headset.');
        } else if (err === 'no-speech') {
          // Normal silence timeout - keep active!
        } else if (err === 'aborted') {
          // Normal abort on reset
        } else {
          console.info('Transient recognition notice:', err);
        }
      };

      recognition.onend = () => {
        // Auto-restart with clean instance if user still wants speech listening enabled!
        if (isListeningActiveRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (isListeningActiveRef.current) {
              try {
                const fresh = initRecognition();
                if (fresh) {
                  recognitionRef.current = fresh;
                  fresh.start();
                }
              } catch (startErr: any) {
                console.warn('Auto-restart recognition error:', startErr);
              }
            }
          }, 250);
        } else {
          setIsListening(false);
        }
      };

      return recognition;
    } catch (e: any) {
      setSttError(e.message || 'Could not initialize speech recognition');
      return null;
    }
  }, [isSttSupported]);

  // Start Speech-to-Text with explicit microphone permission check
  const startListening = useCallback(async () => {
    if (!isSttSupported) {
      setSttError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    setSttError(null);
    isListeningActiveRef.current = true;

    // First ensure microphone permission is granted
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the test tracks immediately so recognition gets the mic
        testStream.getTracks().forEach(t => t.stop());
        await new Promise(r => setTimeout(r, 120));
      }
    } catch (permErr: any) {
      console.warn('Microphone permission check prompt:', permErr);
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        isListeningActiveRef.current = false;
        setIsListening(false);
        setSttError('Microphone permission was blocked. Please click the microphone/lock icon in your browser address bar to allow audio.');
        return;
      }
    }

    // Clean up existing instance if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const recognition = initRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
        setIsListening(true);
      } catch (err: any) {
        if (err.name === 'InvalidStateError') {
          setIsListening(true);
        } else {
          setSttError(err.message || 'Failed to start speech recognition.');
          setIsListening(false);
        }
      }
    }
  }, [isSttSupported, initRecognition]);

  // Stop Speech-to-Text
  const stopListening = useCallback(() => {
    isListeningActiveRef.current = false;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
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
    finalTranscript,
    latestFinalPhrase,
    setTranscript,
    setFinalTranscript,
    sttError,
    startListening,
    stopListening,
    clearTranscript
  };
}
