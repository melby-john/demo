import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Copy, 
  Check, 
  CheckCheck, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  Users, 
  Share2, 
  Grid, 
  Maximize2, 
  BookOpen, 
  Send, 
  Trash2, 
  Edit2, 
  Info, 
  Radio, 
  Loader2, 
  ExternalLink,
  ChevronRight,
  User,
  ShieldCheck,
  X
} from 'lucide-react';
import { useHandLandmarker } from '../hooks/useHandLandmarker';
import { useSpeech } from '../hooks/useSpeech';
import { useWebRTCMeeting } from '../hooks/useWebRTCMeeting';
import { JitsiMeetingView } from '../components/JitsiMeetingView';
import { apiService } from '../services/api';
import { ModelStatus, ChatMessage, AppSettings, PredictionResult } from '../types';
import { DAILY_SIGNS } from '../data/dailySigns';
import { evaluateGeometricRules } from '../utils/signPredictor';

interface LiveMeetingPageProps {
  settings: AppSettings;
  modelStatus: ModelStatus | null;
  backendOnline: boolean;
  onNavigateToTrain: () => void;
  initialRoomId?: string;
}

export const LiveMeetingPage: React.FC<LiveMeetingPageProps> = ({
  settings,
  modelStatus,
  backendOnline,
  onNavigateToTrain,
  initialRoomId
}) => {
  // ==========================================
  // MEETING SETUP & IN-CALL STATE
  // ==========================================
  const [meetingMode, setMeetingMode] = useState<'lobby' | 'in-call'>('in-call');
  const [engineType, setEngineType] = useState<'webrtc' | 'jitsi'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlEngine = params.get('engine');
      if (urlEngine === 'jitsi' || urlEngine === 'webrtc') return urlEngine;
      // If deployed on Vercel or any non-localhost cloud domain, default to Jitsi Cloud SFU
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return 'jitsi';
      }
    } catch (e) {}
    return 'webrtc';
  });
  const [roomIdInput, setRoomIdInput] = useState<string>(() => {
    if (initialRoomId) return initialRoomId;
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlRoom = urlParams?.get('room');
    if (urlRoom) return urlRoom;
    return `isl-room-${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [userName, setUserName] = useState<string>('Participant');
  const [userRole, setUserRole] = useState<'signer' | 'hearing'>('signer');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<'current' | 'local' | 'network' | 'room' | 'jitsi' | null>(null);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'translation' | 'stt' | 'chat'>('translation');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'focus-remote' | 'focus-local'>('grid');
  const [showRoomSettings, setShowRoomSettings] = useState<boolean>(false);

  // Helper to generate full URLs for both local and cloud devices
  const getMeetingUrls = () => {
    const cleanRoom = roomIdInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://demo-oi4k.vercel.app';
    const currentUrl = `${origin}/?room=${encodeURIComponent(cleanRoom)}`;
    const jitsiUrl = `https://meet.jit.si/SignConnect-${cleanRoom}`;
    const localUrl = `http://localhost:3000/?room=${encodeURIComponent(cleanRoom)}`;
    const hostIp = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' 
      ? window.location.hostname 
      : '192.168.0.130';
    const port = typeof window !== 'undefined' && window.location.port ? `:${window.location.port}` : '';
    const networkUrl = `http://${hostIp}${port}/?room=${encodeURIComponent(cleanRoom)}`;
    return { currentUrl, jitsiUrl, localUrl, networkUrl, cleanRoom };
  };

  const copyToClipboardText = (text: string, type: 'current' | 'local' | 'network' | 'room' | 'jitsi') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedType(null);
      setCopiedLink(false);
    }, 2500);
  };

  // ==========================================
  // SPEECH (TTS & STT)
  // ==========================================
  const { 
    speak, 
    isSpeaking, 
    stopSpeaking, 
    isSttSupported, 
    isListening, 
    transcript, 
    finalTranscript,
    latestFinalPhrase,
    sttError,
    startListening, 
    stopListening, 
    clearTranscript 
  } = useSpeech();

  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState<boolean>(settings.autoSpeak ?? true);
  const [isVocalizing, setIsVocalizing] = useState<boolean>(false);

  const lastSpokenWordRef = useRef<string>('');
  const lastSpokenTimeRef = useRef<number>(0);
  const noHandsTimerRef = useRef<any>(null);

  // Live subtitles on video feed
  const [activeSubtitle, setActiveSubtitle] = useState<{
    text: string;
    source: 'local-sign' | 'remote-sign' | 'local-stt' | 'remote-stt';
    senderName: string;
    confidence?: number;
  } | null>(null);

  const subtitleTimeoutRef = useRef<any>(null);

  const triggerSubtitle = useCallback((
    text: string, 
    source: 'local-sign' | 'remote-sign' | 'local-stt' | 'remote-stt',
    senderName: string,
    confidence?: number
  ) => {
    if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);
    setActiveSubtitle({ text, source, senderName, confidence });
    subtitleTimeoutRef.current = setTimeout(() => {
      setActiveSubtitle(null);
    }, 4000);
  }, []);

  // ==========================================
  // CHAT TRANSCRIPT & PREDICTIONS
  // ==========================================
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem('signconnect_chat');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      {
        id: 'welcome',
        text: 'Welcome to SignConnect Zoom Meeting. Connect two participants to exchange live sign-to-text translations and speech captions in real time.',
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [inputText, setInputText] = useState('');
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [pendingCaption, setPendingCaption] = useState<string>('');
  const [isEditingCaption, setIsEditingCaption] = useState<boolean>(false);
  const [showSignCheatSheet, setShowSignCheatSheet] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isClassifyingRef = useRef<boolean>(false);
  const lastPredictionTimeRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    try {
      localStorage.setItem('signconnect_chat', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  // STT listener update for hearing participant: real-time interim subtitle
  useEffect(() => {
    if (transcript && transcript.trim()) {
      triggerSubtitle(transcript, 'local-stt', userName);
      // Broadcast STT interim to peer so they see typing in real-time
      if (webrtcMeeting.isInMeeting) {
        webrtcMeeting.broadcastStt(transcript, false);
      }
    }
  }, [transcript]);

  // When speech utterance is finalized: add to conversation messages & broadcast final
  useEffect(() => {
    if (latestFinalPhrase && latestFinalPhrase.text.trim()) {
      const phrase = latestFinalPhrase.text.trim();
      triggerSubtitle(phrase, 'local-stt', userName);

      const sttMsg: ChatMessage = {
        id: Date.now().toString(),
        text: phrase,
        sender: userRole === 'signer' ? 'signer' : 'hearing',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.text.toLowerCase() === phrase.toLowerCase()) return prev;
        return [...prev, sttMsg];
      });

      if (webrtcMeeting.isInMeeting) {
        webrtcMeeting.broadcastStt(phrase, true);
      }
    }
  }, [latestFinalPhrase]);

  // ==========================================
  // WEBRTC MEETING HOOK
  // ==========================================
  const handleRemoteCaption = useCallback((caption: { text: string; confidence: number; timestamp: string }) => {
    triggerSubtitle(caption.text, 'remote-sign', 'Remote Signer', caption.confidence);

    const autoMsg: ChatMessage = {
      id: Date.now().toString(),
      text: caption.text,
      sender: 'signer',
      timestamp: caption.timestamp,
      isSignPrediction: true,
      confidence: caption.confidence
    };

    setMessages(prev => [...prev, autoMsg]);

    // If local user is hearing participant with autoSpeech on, speak the incoming sign
    if (userRole === 'hearing' && autoSpeechEnabled) {
      speak(caption.text);
    }
  }, [triggerSubtitle, userRole, autoSpeechEnabled, speak]);

  const handleRemoteStt = useCallback((stt: { text: string; isFinal: boolean; timestamp: string }) => {
    triggerSubtitle(stt.text, 'remote-stt', 'Remote Hearing Peer');

    const msg: ChatMessage = {
      id: Date.now().toString(),
      text: stt.text,
      sender: 'hearing',
      timestamp: stt.timestamp
    };

    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.text.toLowerCase() === stt.text.toLowerCase()) return prev;
      return [...prev, msg];
    });
  }, [triggerSubtitle]);

  const handleRemoteChat = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const webrtcMeeting = useWebRTCMeeting({
    onRemoteCaption: handleRemoteCaption,
    onRemoteStt: handleRemoteStt,
    onRemoteChat: handleRemoteChat
  });

  // Reference to remote video DOM element
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (remoteVideoRef.current && webrtcMeeting.remoteStream) {
      if (remoteVideoRef.current.srcObject !== webrtcMeeting.remoteStream) {
        remoteVideoRef.current.srcObject = webrtcMeeting.remoteStream;
      }
      remoteVideoRef.current.play().catch(e => console.warn('Remote video playback:', e));
    }
  }, [webrtcMeeting.remoteStream, webrtcMeeting.remotePeerInfo.isVideoMuted, meetingMode, layoutMode]);

  // Broadcast media track changes to peer
  const handleToggleMic = () => {
    const nextState = toggleMic();
    webrtcMeeting.broadcastMediaState(!nextState, !isVideoEnabled);
  };

  const handleToggleVideo = () => {
    const nextState = toggleVideo();
    webrtcMeeting.broadcastMediaState(!isMicEnabled, !nextState);
  };

  // ==========================================
  // MEDIAPIPE HAND & FACE DETECTION
  // ==========================================
  const handleHandsDetected = useCallback(async (
    hands: any[][],
    face?: any,
    rawFacePoints?: any[]
  ) => {
    if (!hands || hands.length === 0) {
      setCurrentPrediction(null);
      if (!noHandsTimerRef.current) {
        noHandsTimerRef.current = setTimeout(() => {
          lastSpokenWordRef.current = '';
          noHandsTimerRef.current = null;
        }, 1200);
      }
      return;
    }

    if (noHandsTimerRef.current) {
      clearTimeout(noHandsTimerRef.current);
      noHandsTimerRef.current = null;
    }

    // 1. Instant client-side geometric rule prediction (works on Vercel, offline, 60 FPS)
    let result = evaluateGeometricRules(hands, face, rawFacePoints);

    // 2. Query backend model if rules didn't match and backend is available
    if (!result && backendOnline && modelStatus?.ready && !isClassifyingRef.current) {
      const now = Date.now();
      if (now - lastPredictionTimeRef.current >= (settings.cooldownMs || 600)) {
        isClassifyingRef.current = true;
        lastPredictionTimeRef.current = now;
        setIsClassifying(true);
        try {
          result = await apiService.predictSign({
            hands,
            face: face || null,
            faceLandmarks: rawFacePoints && rawFacePoints.length > 0 ? rawFacePoints : undefined
          });
        } catch (err) {
          console.warn('Backend prediction error:', err);
        } finally {
          isClassifyingRef.current = false;
          setIsClassifying(false);
        }
      }
    }

    if (result) {
      setCurrentPrediction(result);

      const threshold = settings.confidenceThreshold || 0.70;
      if (result.recognized && result.confidence >= threshold) {
        const signWord = result.label.replace(/_/g, ' ');
        setPendingCaption(signWord);

        const now = Date.now();
        const isNewSign = lastSpokenWordRef.current.toLowerCase() !== signWord.toLowerCase();
        const hasEnoughTimeElapsed = (now - lastSpokenTimeRef.current) > 2000;

        if (isNewSign || hasEnoughTimeElapsed) {
          lastSpokenWordRef.current = signWord;
          lastSpokenTimeRef.current = now;

          // Display subtitle on video feed
          triggerSubtitle(signWord, 'local-sign', userName, result.confidence);

          // Broadcast to remote peer in real time!
          if (webrtcMeeting.isInMeeting) {
            webrtcMeeting.broadcastCaption(signWord, result.confidence);
          }

          // Automatic Voice Synthesis if enabled
          if (autoSpeechEnabled) {
            setIsVocalizing(true);
            setTimeout(() => setIsVocalizing(false), 1800);
            speak(signWord);
          }

          // Add message to chat log
          const autoMsg: ChatMessage = {
            id: Date.now().toString(),
            text: signWord,
            sender: 'signer',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSignPrediction: true,
            confidence: result.confidence
          };

          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.text.toLowerCase() === signWord.toLowerCase() && !isNewSign) {
              return prev;
            }
            return [...prev, autoMsg];
          });
        }
      }
    }
  }, [backendOnline, modelStatus?.ready, settings.cooldownMs, settings.confidenceThreshold, autoSpeechEnabled, speak, triggerSubtitle, userName, webrtcMeeting]);

  // Hook for camera, microphone & MediaPipe Landmarker
  const {
    videoRef,
    canvasRef,
    localStream,
    isCameraActive,
    isMicEnabled,
    isVideoEnabled,
    isTrackingActive,
    isLoadingModel,
    isFaceReady,
    detectedHands,
    detectedFace,
    error: cameraError,
    startCamera,
    stopCamera,
    toggleMic,
    toggleVideo,
    toggleTracking
  } = useHandLandmarker({
    mirror: settings.mirrorCamera,
    onHandsDetected: handleHandsDetected,
    enableFace: true,
    enableAudio: true, // Captures microphone audio for WebRTC calls
    enableTracking: true
  });

  // Auto-start camera and join meeting room on mount so the user immediately sees their face!
  useEffect(() => {
    let active = true;
    startCamera().then(stream => {
      if (active && stream && engineType === 'webrtc') {
        const cleanRoom = roomIdInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
        webrtcMeeting.joinMeeting(cleanRoom, stream, userRole, userName);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Ensure video element always binds to localStream across any re-render
  useEffect(() => {
    if (videoRef.current && localStream) {
      if (videoRef.current.srcObject !== localStream) {
        videoRef.current.srcObject = localStream;
        videoRef.current.play().catch(e => console.warn('Local video play warning:', e));
      }
    }
  }, [localStream, isCameraActive, isVideoEnabled, meetingMode]);

  // ==========================================
  // MEETING ACTIONS
  // ==========================================
  const handleStartOrJoinMeeting = async () => {
    if (!roomIdInput.trim()) {
      alert('Please enter a valid Meeting Room ID.');
      return;
    }

    const cleanRoom = roomIdInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    if (engineType === 'webrtc') {
      let stream: MediaStream | null = localStream;
      if (!isCameraActive || !stream) {
        stream = await startCamera();
        if (!stream) {
          alert('Could not access camera or microphone. Please grant browser permissions.');
          return;
        }
      }

      await webrtcMeeting.joinMeeting(cleanRoom, stream, userRole, userName);
    }

    setMeetingMode('in-call');
  };

  const handleEndCall = useCallback(() => {
    if (confirm('Leave this video meeting?')) {
      if (engineType === 'webrtc') {
        webrtcMeeting.leaveMeeting();
      }
      stopCamera();
      setMeetingMode('lobby');
      setActiveSubtitle(null);
    }
  }, [engineType, webrtcMeeting, stopCamera]);

  const copyMeetingLink = () => {
    const origin = window.location.origin;
    const link = `${origin}/?room=${encodeURIComponent(roomIdInput.trim())}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: userRole === 'signer' ? 'signer' : 'hearing',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    if (webrtcMeeting.isInMeeting) {
      webrtcMeeting.broadcastChatMessage(newMsg);
    }

    setInputText('');
    clearTranscript();
  };

  const handleClearChat = () => {
    if (confirm('Clear the meeting conversation transcript?')) {
      setMessages([
        {
          id: 'welcome',
          text: 'Conversation transcript cleared.',
          sender: 'system',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      localStorage.removeItem('signconnect_chat');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const captionFontSize = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }[settings.captionSize || 'lg'];

  const threshold = settings.confidenceThreshold || 0.70;

  // ==========================================
  // RENDER: LOBBY / SETUP SCREEN
  // ==========================================
  if (meetingMode === 'lobby') {
    return (
      <div className="space-y-6 animate-fade-in font-sans max-w-5xl mx-auto">
        
        {/* Header Hero Banner */}
        <div className="bento-card p-8 sm:p-10 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-cyan-300 text-xs font-semibold backdrop-blur-xl">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>Real-Time 2-Participant Video Call Studio</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-display">
              Join Video Meeting <br />
              <span className="gradient-text-hero">With Live Sign & Speech AI</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Connect two devices seamlessly in a Zoom-style conference. Indian Sign Language (ISL) gestures are converted to spoken voice and live captions for hearing peers, and spoken words are transcribed into instant subtitles.
            </p>
          </div>
        </div>

        {/* Setup Grid: Meeting Config & Camera Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Room Setup & Role Config (7 cols) */}
          <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            
            {/* 1. Room Code */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Meeting Room ID</span>
                <span className="text-[11px] text-cyan-400 font-normal">Share this code with peer</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  placeholder="e.g. isl-meeting-room"
                  className="flex-1 px-4 py-3 rounded-2xl glass-input text-white text-sm font-mono font-semibold placeholder-slate-500 focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={copyMeetingLink}
                  className="px-4 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/10 text-xs font-bold transition flex items-center gap-2 active:scale-95"
                  title="Copy shareable meeting link"
                >
                  {copiedLink ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* 2. Participant Name & Role Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Rahul"
                  className="w-full px-4 py-3 rounded-2xl glass-input text-white text-sm placeholder-slate-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Your Primary Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setUserRole('signer'); setAutoSpeechEnabled(true); }}
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      userRole === 'signer'
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base">🤟</span>
                    <span>Signer (Deaf)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUserRole('hearing'); }}
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      userRole === 'hearing'
                        ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base">🎙️</span>
                    <span>Hearing Peer</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Real Video Engine Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Video Calling Engine</span>
                <span className="text-[11px] text-emerald-400 font-medium">Both connect 2 devices</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setEngineType('webrtc')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    engineType === 'webrtc'
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>WebRTC Direct HD</span>
                    </span>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold">
                      Zoom UI
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Peer-to-peer 2-way calling with 3D MediaPipe landmark overlay, synchronized sign subtitles & STT audio.
                  </p>
                </div>

                <div
                  onClick={() => setEngineType('jitsi')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    engineType === 'jitsi'
                      ? 'bg-indigo-950/40 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <Video className="w-4 h-4 text-indigo-400" />
                      <span>Jitsi Meet Cloud</span>
                    </span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                      Global SFU
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Cloud multi-device conference room embedded via Jitsi Meet External API with translation side panel.
                  </p>
                </div>
              </div>
            </div>

            {/* Launch Meeting Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartOrJoinMeeting}
                className="w-full py-4 rounded-2xl linear-btn-primary font-bold text-white text-base shadow-[0_0_30px_rgba(6,182,212,0.4)] active:scale-95 transition flex items-center justify-center gap-3"
              >
                <Video className="w-5 h-5" />
                <span>Join Video Meeting Now &rarr;</span>
              </button>
            </div>

          </div>

          {/* Right Column: Pre-flight Device Preview & Help (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Camera & Mic Test Card */}
            <div className="bento-card p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
                  <Video className="w-4 h-4 text-cyan-400" />
                  <span>Media Devices Pre-Flight</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {isCameraActive ? 'Active' : 'Standby'}
                </span>
              </div>

              {/* Video Preview Box */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/80 border border-white/10 flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${settings.mirrorCamera ? 'scale-x-[-1]' : ''} ${
                    isCameraActive ? 'block' : 'hidden'
                  }`}
                />
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-10 ${
                    isCameraActive ? 'block' : 'hidden'
                  }`}
                />

                {!isCameraActive && (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                      <VideoOff className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-400">Camera preview inactive</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={isLoadingModel}
                      className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-cyan-300 font-semibold text-xs border border-cyan-400/30 transition"
                    >
                      {isLoadingModel ? 'Loading MediaPipe...' : 'Test Camera & Mic'}
                    </button>
                  </div>
                )}
              </div>

              {/* Device Status Pills */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2">
                  <Video className={`w-3.5 h-3.5 ${isCameraActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="text-slate-300 font-medium">
                    {isCameraActive ? 'Camera Ready' : 'Camera Off'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2">
                  <Mic className={`w-3.5 h-3.5 ${isMicEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="text-slate-300 font-medium">
                    {isMicEnabled ? 'Microphone Ready' : 'Mic Off'}
                  </span>
                </div>
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            {/* Quick Multi-Device Testing Instructions */}
            <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-3 text-xs">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>How to test with 2 participants:</span>
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
                <li>Click <strong>Join Video Meeting Now</strong> in this window.</li>
                <li>Copy the meeting link or note the Room ID (e.g. <code className="bg-black/60 px-1.5 py-0.5 rounded text-cyan-300 font-mono">{roomIdInput}</code>).</li>
                <li>Open a second browser tab (or another laptop/phone on your network) at the exact same URL.</li>
                <li>Both devices will automatically establish direct two-way video, audio, and sign translation!</li>
              </ol>
            </div>

          </div>

        </div>

      </div>
    );
  }

  // ==========================================
  // RENDER: IN-CALL ZOOM INTERFACE
  // ==========================================
  return (
    <div className="space-y-4 animate-fade-in font-sans">
      
      {/* Top Meeting Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 px-6 rounded-2xl glass-card border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="font-display font-bold text-sm text-white">Live Zoom Conference</span>
          </div>

          <span className="text-slate-600 hidden sm:inline">&bull;</span>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-mono">
            <span className="text-slate-400">Room:</span>
            <span className="text-cyan-300 font-bold">{roomIdInput}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="px-3.5 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.25)] active:scale-95"
            title="Open invite dialog to copy meeting URLs"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Invite Link</span>
          </button>
        </div>

        {/* Engine and Participant Status Pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEngineType(prev => prev === 'webrtc' ? 'jitsi' : 'webrtc')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition active:scale-95 shadow-md ${
              engineType === 'webrtc' 
                ? 'bg-cyan-950/80 hover:bg-cyan-900/80 border-cyan-500/40 text-cyan-300' 
                : 'bg-indigo-950/80 hover:bg-indigo-900/80 border-indigo-500/40 text-indigo-300'
            }`}
            title="Click to switch between WebRTC Direct (Local) and Jitsi Cloud (Phone/Remote)"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{engineType === 'webrtc' ? 'WebRTC Direct P2P (Switch to Jitsi Cloud)' : 'Jitsi Meet Cloud (Switch to WebRTC)'}</span>
          </button>

          {engineType === 'webrtc' && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
              webrtcMeeting.remoteStream 
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' 
                : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
            }`}>
              <Users className="w-3 h-3" />
              <span>{webrtcMeeting.remoteStream ? '2 Participants Connected' : 'Waiting for Peer...'}</span>
            </span>
          )}

          {/* Quick End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Video Stage (Left 8 Cols) + Translation & Chat Panel (Right 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: 2 Video Feeds + Live Captions Overlay + Zoom Controls (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          
          {/* VIDEO STAGE CONTAINER */}
          {engineType === 'jitsi' ? (
            <JitsiMeetingView
              roomName={roomIdInput}
              userName={userName}
              userRole={userRole}
              onClose={handleEndCall}
            />
          ) : (
            <div className="relative rounded-3xl overflow-hidden bento-card border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] bg-black flex flex-col min-h-[520px]">
              
              {/* TOP PARTICIPANT VIDEO GRID (Zoom 2-Participant View) */}
              <div className={`flex-1 p-3 grid gap-3 ${
                layoutMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2' 
                  : 'grid-cols-1'
              }`}>
                
                {/* 1. PARTICIPANT 1: LOCAL PARTICIPANT (YOU) */}
                <div className={`relative aspect-video rounded-2xl overflow-hidden bg-black/90 border border-white/10 flex items-center justify-center group ${
                  layoutMode === 'focus-remote' ? 'hidden' : ''
                }`}>
                  {/* Native Video Feed */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${settings.mirrorCamera ? 'scale-x-[-1]' : ''} ${
                      isVideoEnabled && isCameraActive ? 'block' : 'hidden'
                    }`}
                  />

                  {/* 21 3D Hand Landmarks & Face Anchors Canvas */}
                  <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-10 ${
                      isVideoEnabled && isCameraActive ? 'block' : 'hidden'
                    }`}
                  />

                  {/* Camera Offline / Activate Camera Overlay */}
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-black/85 z-20">
                      <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                        <Video className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Camera Access Offline</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs">
                          Click below to start your webcam and view your face in real time.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-6 py-2.5 rounded-full linear-btn-primary font-bold text-xs text-white shadow-lg active:scale-95 transition flex items-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        <span>Activate Camera & Show My Face</span>
                      </button>
                    </div>
                  )}

                  {/* Avatar card if camera is active but video is manually toggled off */}
                  {isCameraActive && !isVideoEnabled && (
                    <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 font-display font-extrabold text-xl">
                        {userName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-slate-300">{userName} (Video Muted)</span>
                    </div>
                  )}

                  {/* Top-Left Participant Name Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-20">
                    <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md">
                      <span className="font-bold">{userName} (You)</span>
                      <span className="text-[10px] uppercase font-bold text-cyan-300 px-1.5 rounded bg-cyan-950/60 border border-cyan-400/30">
                        {userRole === 'signer' ? 'Signer' : 'Hearing'}
                      </span>
                    </span>

                    {/* Mic mute pill */}
                    <span className={`p-1.5 rounded-full backdrop-blur-md border ${
                      isMicEnabled ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                    }`}>
                      {isMicEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                    </span>
                  </div>

                  {/* Top-Right Vision HUD Status (Hands and Face indicators) */}
                  {isCameraActive && isVideoEnabled && (
                    <div className="absolute top-3 right-3 pointer-events-none z-20 flex items-center gap-1.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border transition shadow-md ${
                        detectedHands.length > 0 
                          ? 'bg-cyan-950/80 border-cyan-400/50 text-cyan-300' 
                          : 'bg-black/60 border-white/10 text-slate-400'
                      }`}>
                        {detectedHands.length > 0 ? `${detectedHands.length} Hand(s) Locked` : 'Awaiting Sign'}
                      </span>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border transition shadow-md ${
                        detectedFace 
                          ? 'bg-emerald-950/80 border-emerald-400/40 text-emerald-300' 
                          : 'bg-black/60 border-white/10 text-slate-400'
                      }`}>
                        {detectedFace ? 'Face Anchors Active' : isFaceReady ? 'Align Face in Frame' : 'Tracking Face'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. PARTICIPANT 2: REMOTE PARTICIPANT (PEER) */}
                <div className={`relative aspect-video rounded-2xl overflow-hidden bg-black/90 border border-white/10 flex items-center justify-center group ${
                  layoutMode === 'focus-local' ? 'hidden' : ''
                }`}>
                  
                  {/* Incoming Remote Video Stream */}
                  <video
                    ref={(el) => {
                      remoteVideoRef.current = el;
                      if (el && webrtcMeeting.remoteStream && el.srcObject !== webrtcMeeting.remoteStream) {
                        el.srcObject = webrtcMeeting.remoteStream;
                        el.play().catch(e => console.warn('Remote video playback warning:', e));
                      }
                    }}
                    playsInline
                    autoPlay
                    onLoadedMetadata={(e) => {
                      (e.target as HTMLVideoElement).play().catch(e => console.warn('Playback on metadata load:', e));
                    }}
                    className={`w-full h-full object-cover ${
                      webrtcMeeting.remoteStream && !webrtcMeeting.remotePeerInfo.isVideoMuted ? 'block' : 'hidden'
                    }`}
                  />

                  {/* Waiting for Peer / Direct URLs & Invite Card */}
                  {(!webrtcMeeting.remoteStream || webrtcMeeting.remotePeerInfo.isVideoMuted) && (
                    <div className="text-center p-4 sm:p-6 space-y-3.5 max-w-md w-full relative z-10">
                      {webrtcMeeting.remoteStream ? (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-display font-extrabold text-xl">
                            {webrtcMeeting.remotePeerInfo.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-slate-300">
                            {webrtcMeeting.remotePeerInfo.name} (Camera Off)
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-3 text-left">
                          <div className="text-center space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
                              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                              <span>Waiting for Second Participant</span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Share either URL below to connect the second participant:
                            </p>
                          </div>

                          {/* Direct URL Box 1: Wi-Fi / Second Device */}
                          <div className="p-3 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-indigo-200">📱 Mobile / Second Laptop (Wi-Fi):</span>
                              <span className="text-[10px] text-emerald-400 font-semibold font-mono">Recommended</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={getMeetingUrls().networkUrl}
                                className="flex-1 px-3 py-1.5 rounded-xl bg-black/70 border border-indigo-400/30 text-cyan-300 text-xs font-mono select-all outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => copyToClipboardText(getMeetingUrls().networkUrl, 'network')}
                                className="px-3 py-1.5 rounded-xl linear-btn-primary font-bold text-white text-xs shrink-0 flex items-center gap-1 active:scale-95 transition"
                              >
                                {copiedType === 'network' ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedType === 'network' ? 'Copied!' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Direct URL Box 2: Localhost / Same Device */}
                          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-medium text-slate-300">💻 Same PC (Incognito / 2nd Tab):</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={getMeetingUrls().localUrl}
                                className="flex-1 px-3 py-1.5 rounded-xl bg-black/70 border border-white/10 text-slate-300 text-xs font-mono select-all outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => copyToClipboardText(getMeetingUrls().localUrl, 'local')}
                                className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 font-bold text-xs shrink-0 flex items-center gap-1 border border-white/10 active:scale-95 transition"
                              >
                                {copiedType === 'local' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedType === 'local' ? 'Copied!' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  )}

                  {/* Top-Left Remote Participant Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-20">
                    <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md">
                      <span className="font-bold">{webrtcMeeting.remotePeerInfo.name}</span>
                      <span className="text-[10px] uppercase font-bold text-indigo-300 px-1.5 rounded bg-indigo-950/60 border border-indigo-400/30">
                        {webrtcMeeting.remotePeerInfo.role === 'signer' ? 'Signer' : 'Hearing Peer'}
                      </span>
                    </span>

                    {/* Remote mic mute pill */}
                    <span className={`p-1.5 rounded-full backdrop-blur-md border ${
                      !webrtcMeeting.remotePeerInfo.isAudioMuted ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                    }`}>
                      {!webrtcMeeting.remotePeerInfo.isAudioMuted ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                    </span>
                  </div>

                  {/* Top-Right Connected Status Pill */}
                  <div className="absolute top-3 right-3 pointer-events-none z-20">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border ${
                      webrtcMeeting.remoteStream 
                        ? 'bg-emerald-950/80 border-emerald-400/40 text-emerald-300' 
                        : 'bg-black/60 border-white/10 text-slate-400'
                    }`}>
                      {webrtcMeeting.remoteStream ? 'HD Video Active' : 'Connecting...'}
                    </span>
                  </div>

                </div>

              </div>

              {/* LIVE FLOATING CAPTIONS BANNER (Zoom Subtitle Bar) */}
              {activeSubtitle && (
                <div className="px-4 py-2.5 z-30 flex items-center justify-center animate-fade-in pointer-events-none">
                  <div className="px-6 py-3 rounded-full floating-island border border-cyan-400/50 shadow-[0_0_35px_rgba(6,182,212,0.4)] text-center flex items-center gap-3 backdrop-blur-2xl">
                    {activeSubtitle.source.includes('sign') ? (
                      <span className="text-base">🤟</span>
                    ) : (
                      <Mic className="w-4 h-4 text-violet-400 animate-pulse" />
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-300 uppercase">
                        [{activeSubtitle.senderName}]:
                      </span>
                      <span className={`${captionFontSize} font-display font-extrabold text-white tracking-wide`}>
                        "{activeSubtitle.text}"
                      </span>
                    </div>

                    {activeSubtitle.confidence && (
                      <span className="text-[10px] font-mono text-emerald-300 font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30">
                        {Math.round(activeSubtitle.confidence * 100)}% Match
                      </span>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ZOOM FLOATING BOTTOM CONTROL TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 px-6 rounded-2xl glass-card border border-white/10 backdrop-blur-xl">
            
            {/* Left Controls: Mic & Camera Toggles */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMic}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                  isMicEnabled
                    ? 'bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/10'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                }`}
                title={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isMicEnabled ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-rose-400" />}
                <span>{isMicEnabled ? 'Mute' : 'Unmuted'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleVideo}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                  isVideoEnabled
                    ? 'bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/10'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                }`}
                title={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
              >
                {isVideoEnabled ? <Video className="w-4 h-4 text-cyan-400" /> : <VideoOff className="w-4 h-4 text-rose-400" />}
                <span>{isVideoEnabled ? 'Stop Video' : 'Start Video'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleTracking()}
                className={`hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  isTrackingActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                    : 'bg-white/[0.04] text-slate-400 border border-white/10'
                }`}
                title="Toggle 3D hand & face landmark overlays"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI HUD: {isTrackingActive ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* Center Controls: Voice & STT Toggles */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoSpeechEnabled(!autoSpeechEnabled)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  autoSpeechEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                    : 'bg-white/[0.04] text-slate-400 border border-white/10'
                }`}
                title="Automatically speaks recognized signs aloud to the other person"
              >
                {autoSpeechEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
                <span>Auto-Voice: {autoSpeechEnabled ? 'ON' : 'OFF'}</span>
              </button>

              {isSttSupported ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                      isListening
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/10'
                    }`}
                    title="Hearing participant speech-to-text live subtitles & captions"
                  >
                    {isListening ? (
                      <>
                        <Mic className="w-4 h-4 text-purple-200 animate-pulse" />
                        <span className="flex items-center gap-1.5">
                          <span>Speech Captions:</span>
                          <span className="text-purple-200 uppercase font-black tracking-wider">Listening</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <MicOff className="w-4 h-4 text-slate-400" />
                        <span>Speech Captions: OFF</span>
                      </>
                    )}
                  </button>

                  {sttError && (
                    <span 
                      className="text-[10px] px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium cursor-help"
                      title={sttError}
                    >
                      Mic Blocked
                    </span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/[0.02] text-slate-500 border border-white/5 cursor-not-allowed"
                  title="Web Speech API not supported in this browser. Please use Chrome, Edge, or Safari."
                >
                  <MicOff className="w-4 h-4" />
                  <span>STT (Use Chrome)</span>
                </button>
              )}
            </div>

            {/* Right Controls: Guide & End Call */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEngineType(prev => prev === 'webrtc' ? 'jitsi' : 'webrtc')}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition ${
                  engineType === 'webrtc'
                    ? 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30'
                    : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30'
                }`}
                title="Toggle between WebRTC Direct (Localhost) and Jitsi Cloud (Phones/Remote)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{engineType === 'webrtc' ? 'Switch to Jitsi' : 'Switch to WebRTC'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSignCheatSheet(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition"
                title="View 24 ISL Daily Signs Guide"
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Signs Guide</span>
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                title="End video call"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </button>
            </div>

          </div>

        </div>

        {/* Right Column: Sign Language Translation Panel & Chat (4 cols) */}
        <div className="lg:col-span-4 flex flex-col h-[650px] rounded-3xl bento-card border border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          {/* Panel Tab Navigation Header */}
          <div className="p-3 bg-white/[0.02] border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('translation')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'translation'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🤟 Sign Translation
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stt')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'stt'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Speech → Text</span>
                {isListening && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'chat'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                💬 Chat & Log
              </button>
            </div>

            <button
              type="button"
              onClick={handleClearChat}
              title="Clear transcript"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Vision AI Camera Tracker when Jitsi mode is active */}
          {engineType === 'jitsi' && (
            <div className="p-3 pb-0">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/90 border border-cyan-500/40 flex items-center justify-center shadow-lg group">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${settings.mirrorCamera ? 'scale-x-[-1]' : ''}`}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
                />
                <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-cyan-300 flex items-center gap-1.5 z-20">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>AI Hand Tracker</span>
                </div>
                <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white z-20">
                  {detectedHands.length > 0 ? `${detectedHands.length} Hand(s) Locked` : 'Show Hand to Camera'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: SIGN TRANSLATION & LIVE PREDICTIONS */}
          {activeTab === 'translation' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Live Recognition Gate & Score */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Active Sign Detection</span>
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/[0.04] text-cyan-400 font-bold border border-white/10">
                    {currentPrediction ? `${(currentPrediction.confidence * 100).toFixed(0)}% Match` : 'Awaiting'}
                  </span>
                </div>

                {detectedHands.length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">
                    Hold your hands in front of the camera to translate Indian Sign Language into voice and subtitles.
                  </p>
                ) : currentPrediction && currentPrediction.confidence >= threshold ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-2xl font-display font-extrabold text-cyan-300 capitalize">
                        {currentPrediction.label.replace(/_/g, ' ')}
                      </h4>
                      {autoSpeechEnabled && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center gap-1">
                          <Volume2 className="w-3 h-3" />
                          <span>Spoken Aloud</span>
                        </span>
                      )}
                    </div>
                    {/* Confidence Bar */}
                    <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden border border-white/10">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                        style={{ width: `${Math.min(100, currentPrediction.confidence * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center text-xs text-amber-300 flex items-center justify-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sign not recognized clearly. Try adjusting hand angle.</span>
                  </div>
                )}
              </div>

              {/* Pending Caption Actions */}
              {pendingCaption && (
                <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Recognized Word:</span>
                    <button
                      type="button"
                      onClick={() => speak(pendingCaption)}
                      className="p-1 rounded text-cyan-300 hover:text-white transition flex items-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Speak Aloud</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditingCaption ? (
                      <input
                        type="text"
                        value={pendingCaption}
                        onChange={(e) => setPendingCaption(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-black/60 text-white border border-cyan-400 text-sm font-bold"
                      />
                    ) : (
                      <span className="font-display font-black text-white text-lg capitalize tracking-wide flex-1">
                        "{pendingCaption}"
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditingCaption(!isEditingCaption)}
                      className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300"
                      title="Edit recognized sign text"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Translation History Feed */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Recent Sign Subtitles
                </span>
                {messages.filter(m => m.isSignPrediction).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No signs demonstrated yet.</p>
                ) : (
                  messages.filter(m => m.isSignPrediction).slice(-6).map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🤟</span>
                        <span className="font-bold text-white capitalize">{msg.text}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => speak(msg.text)}
                        className="p-1 rounded text-cyan-400 hover:text-white"
                        title="Voice aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 2: SPEECH-TO-TEXT LIVE TRANSCRIBER & MICROPHONE MONITOR */}
          {activeTab === 'stt' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Mic Status & Quick Toggle Banner */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isListening 
                  ? 'bg-purple-950/40 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                  : 'bg-white/[0.03] border-white/[0.06]'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isListening ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40' : 'bg-white/[0.05] text-slate-400'
                    }`}>
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Speech Captions</h4>
                      <p className="text-[10px] text-slate-400">
                        {isListening ? 'Continuous listening active' : 'Click to start live speech transcription'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    disabled={!isSttSupported}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
                      isListening
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'linear-btn-primary text-white'
                    }`}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isListening ? 'Pause' : 'Start'}</span>
                  </button>
                </div>

                {/* Animated Waveform when listening */}
                {isListening ? (
                  <div className="p-3 rounded-xl bg-black/40 border border-purple-500/30 flex items-center justify-between">
                    <span className="text-[11px] text-purple-300 font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                      <span>Listening for voice...</span>
                    </span>
                    <div className="flex items-center gap-1 h-4">
                      <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce"></span>
                      <span className="w-1 h-4 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
                      <span className="w-1 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
                      <span className="w-1 h-4 bg-pink-400 rounded-full animate-bounce [animation-delay:450ms]"></span>
                      <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:200ms]"></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Speak into your microphone to generate instant captions for the deaf participant, with automatic voice transcription.
                  </p>
                )}
              </div>

              {/* STT Error Alert if microphone permission was blocked */}
              {sttError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Microphone Permission Alert</span>
                  </div>
                  <p className="text-[11px] text-rose-200/90 leading-relaxed">
                    {sttError}
                  </p>
                  <p className="text-[10px] text-slate-400 pt-1">
                    Tip: Click the lock or camera icon on the left of your browser URL bar, set Microphone to <strong>"Allow"</strong>, and click Start.
                  </p>
                </div>
              )}

              {/* Current Live Utterance Box */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Live Spoken Words</span>
                  </span>
                  {transcript && (
                    <span className="text-[10px] text-purple-300 font-mono animate-pulse">
                      Transcribing live...
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-black/60 border border-white/10 min-h-[60px] text-xs text-slate-200 font-medium">
                  {transcript ? (
                    <span className="text-white font-semibold">"{transcript}"</span>
                  ) : (
                    <span className="text-slate-500 italic">
                      {isListening ? 'Speak now into microphone...' : 'Microphone is paused. Click Start to speak.'}
                    </span>
                  )}
                </div>
              </div>

              {/* Accumulated Spoken Captions Feed */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Speech Subtitles Log
                  </span>
                  {messages.filter(m => m.sender === 'hearing' || m.sender === userRole).length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allSpeech = messages
                          .filter(m => m.sender === 'hearing' || m.sender === userRole)
                          .map(m => m.text)
                          .join('\n');
                        navigator.clipboard.writeText(allSpeech);
                      }}
                      className="text-[10px] text-purple-400 hover:text-white transition flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Log</span>
                    </button>
                  )}
                </div>

                {messages.filter(m => m.sender === 'hearing' || m.sender === userRole).length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    No speech recorded yet. Turn on Speech Captions and speak.
                  </p>
                ) : (
                  messages
                    .filter(m => m.sender === 'hearing' || m.sender === userRole)
                    .slice(-8)
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 flex-1 pr-2">
                          <span className="text-xs">🎙️</span>
                          <span className="font-medium text-slate-200">{msg.text}</span>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-auto">{msg.timestamp}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => speak(msg.text)}
                          className="p-1 rounded text-purple-400 hover:text-white shrink-0"
                          title="Replay with TTS voice"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                )}
              </div>

            </div>
          )}

          {/* TAB 3: CHAT TRANSCRIPT & TWO-WAY MESSAGING */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isSigner = msg.sender === 'signer';
                  const isSystem = msg.sender === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center my-1">
                        <span className="inline-block px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] text-slate-400">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isSigner ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">
                          {isSigner ? 'Signer' : 'Hearing Peer'}
                        </span>
                        <span>&bull;</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isSigner
                            ? 'bg-white/[0.05] border border-cyan-500/30 text-slate-100 rounded-tl-sm'
                            : 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-tr-sm'
                        }`}
                      >
                        <p className="font-medium">{msg.text}</p>
                        <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-white/10 text-[10px]">
                          <button
                            type="button"
                            onClick={() => speak(msg.text)}
                            className="p-0.5 text-cyan-300 hover:text-white flex items-center gap-1"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Replay</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(msg.text, msg.id)}
                            className="p-0.5 text-slate-300 hover:text-white ml-auto"
                          >
                            {copiedId === msg.id ? <CheckCheck className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-white/[0.02] border-t border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message to peer..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!inputText.trim()}
                    className="p-2.5 rounded-xl linear-btn-primary disabled:opacity-40 text-white font-bold transition active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 24 ISL Daily Signs Cheat Sheet Modal */}
      {showSignCheatSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-fade-in">
          <div className="relative max-w-4xl w-full floating-island rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border border-white/15">
            <div className="flex items-center justify-between p-4 px-6 border-b border-white/[0.08] bg-black/60">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Daily Sign Language Quick Cheat Sheet (24 Essential Signs)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSignCheatSheet(false)}
                className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-black/40">
              {DAILY_SIGNS.map((s) => (
                <div
                  key={s.id}
                  className="glass-card rounded-xl p-2.5 flex flex-col justify-between hover:border-cyan-500/40 transition group"
                >
                  <div className="h-28 flex items-center justify-center bg-black/60 rounded-lg p-1.5 mb-2 overflow-hidden border border-white/[0.06]">
                    <img
                      src={s.image}
                      alt={s.title}
                      className="max-h-full max-w-full object-contain rounded transition group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{s.title}</span>
                      <span className="text-[9px] text-cyan-400 font-medium px-1 rounded bg-black/60 border border-white/10">
                        {s.category.split(' ')[0]}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight">
                      {s.movement}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 px-6 border-t border-white/[0.08] bg-black/60 flex items-center justify-between text-xs text-slate-400">
              <span>Hold your hand in front of the camera and form these gestures to translate into live voice.</span>
              <button
                type="button"
                onClick={() => setShowSignCheatSheet(false)}
                className="px-4 py-2 rounded-xl linear-btn-primary text-white font-semibold transition"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Invite Participant Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-fade-in">
          <div className="relative max-w-lg w-full floating-island rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/15 bg-black/90">
            {/* Header */}
            <div className="flex items-center justify-between p-5 px-6 border-b border-white/[0.08] bg-black/60">
              <div className="flex items-center gap-2.5 text-white font-bold text-base">
                <Share2 className="w-5 h-5 text-cyan-400" />
                <span>Invite Second Participant</span>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Meeting Room Code
                </h4>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/10 font-mono text-cyan-300 font-bold text-sm select-all">
                    {getMeetingUrls().cleanRoom}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboardText(getMeetingUrls().cleanRoom, 'room')}
                    className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    {copiedType === 'room' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'room' ? 'Copied Code!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              {/* Option 1: Live Web / Vercel Meeting Link */}
              <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-400/40 space-y-2 shadow-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <span>🌐 Shareable Web Link (Vercel / Mobile / Any PC)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold">
                    Works for Anyone
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Send this link to the second participant. When they open it on their phone or computer, both your video feeds and sign translation sync in real time:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={getMeetingUrls().currentUrl}
                    className="flex-1 px-3 py-2 rounded-xl bg-black/80 border border-indigo-400/40 text-cyan-300 text-xs font-mono select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboardText(getMeetingUrls().currentUrl, 'current')}
                    className="px-3.5 py-2 rounded-xl linear-btn-primary font-bold text-white text-xs shrink-0 flex items-center gap-1.5 active:scale-95 transition shadow-md"
                  >
                    {copiedType === 'current' ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'current' ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  <a
                    href={getMeetingUrls().currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 font-bold text-xs shrink-0 transition"
                  >
                    Open ↗
                  </a>
                </div>
              </div>

              {/* Option 2: Direct Jitsi Cloud Room Link (Backup for Mobile) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">📱 Direct Jitsi Cloud Link</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Global SFU</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getMeetingUrls().jitsiUrl}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-slate-400 text-[11px] font-mono select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboardText(getMeetingUrls().jitsiUrl, 'jitsi')}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-medium shrink-0 flex items-center gap-1"
                  >
                    {copiedType === 'jitsi' ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'jitsi' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Localhost (Same PC second tab / Incognito) */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>💻 Same Laptop (2 Tabs / Incognito Window)</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-bold font-mono">WebRTC Direct</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Open this link in <strong>Chrome Incognito or Edge</strong> on this computer to test 2-participant video feeds side by side with 3D landmark overlays.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getMeetingUrls().localUrl}
                    className="flex-1 px-3 py-2 rounded-xl bg-black/70 border border-white/10 text-slate-300 text-xs font-mono select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboardText(getMeetingUrls().localUrl, 'local')}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 font-bold text-xs shrink-0 flex items-center gap-1.5 border border-white/10 active:scale-95 transition"
                  >
                    {copiedType === 'local' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'local' ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  <a
                    href={getMeetingUrls().localUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 font-bold text-xs shrink-0 transition"
                  >
                    Open Tab ↗
                  </a>
                </div>
              </div>

              {/* Option 3: Local Wi-Fi Network */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-400">📶 Direct Local Wi-Fi IP</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getMeetingUrls().networkUrl}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-slate-400 text-[11px] font-mono select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboardText(getMeetingUrls().networkUrl, 'network')}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-medium shrink-0 flex items-center gap-1"
                  >
                    {copiedType === 'network' ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'network' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-amber-400/90 leading-tight">
                  ⚠️ Note: On public event/hackathon Wi-Fi (client isolation enabled), devices cannot connect directly. Use the <strong>Jitsi Cloud Link</strong> above.
                </p>
              </div>
            </div>

            <div className="p-4 px-6 border-t border-white/[0.08] bg-black/60 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-5 py-2.5 rounded-xl linear-btn-primary font-bold text-xs text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
