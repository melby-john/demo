import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';

export interface RemotePeerInfo {
  name: string;
  role: 'signer' | 'hearing';
  isAudioMuted: boolean;
  isVideoMuted: boolean;
}

export interface UseWebRTCMeetingOptions {
  onRemoteCaption?: (caption: { text: string; confidence: number; timestamp: string }) => void;
  onRemoteStt?: (stt: { text: string; isFinal: boolean; timestamp: string }) => void;
  onRemoteChat?: (msg: ChatMessage) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

function getWebSocketUrl(roomId: string): string {
  try {
    const saved = localStorage.getItem('signconnect_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.backendUrl) {
        const u = new URL(parsed.backendUrl);
        const protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${u.host}/ws/meeting/${encodeURIComponent(roomId)}`;
      }
    }
  } catch (e) {}

  // Fallback default
  const loc = typeof window !== 'undefined' ? window.location : null;
  if (loc && loc.hostname && loc.hostname !== 'localhost' && loc.hostname !== '127.0.0.1') {
    return `ws://${loc.hostname}:8000/ws/meeting/${encodeURIComponent(roomId)}`;
  }
  return `ws://127.0.0.1:8000/ws/meeting/${encodeURIComponent(roomId)}`;
}

export function useWebRTCMeeting(options: UseWebRTCMeetingOptions = {}) {
  const { onRemoteCaption, onRemoteStt, onRemoteChat } = options;

  const [isInMeeting, setIsInMeeting] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>('');
  const [isInitiator, setIsInitiator] = useState<boolean>(false);
  const [peerCount, setPeerCount] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'
  >('idle');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remotePeerInfo, setRemotePeerInfo] = useState<RemotePeerInfo>({
    name: 'Remote Participant',
    role: 'hearing',
    isAudioMuted: false,
    isVideoMuted: false
  });
  const [webrtcError, setWebrtcError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const userInfoRef = useRef<{ name: string; role: 'signer' | 'hearing' }>({
    name: 'You',
    role: 'signer'
  });

  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Cleanup WebRTC connection & WebSocket
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'leave-room' }));
        }
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }

    iceCandidateQueueRef.current = [];
    localStreamRef.current = null;
    setRemoteStream(null);
    setIsInMeeting(false);
    setConnectionStatus('idle');
    setPeerCount(0);
  }, []);

  // Send JSON message over WebSocket
  const sendWsMessage = useCallback((msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Flush queued ICE candidates once remote description is active
  const flushIceCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    while (iceCandidateQueueRef.current.length > 0) {
      const cand = iceCandidateQueueRef.current.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('Failed to add queued ICE candidate:', e);
        }
      }
    }
  }, []);

  // Initialize RTCPeerConnection
  const createPeerConnection = useCallback((stream: MediaStream) => {
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (e) {}
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Attach local media tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Listen for incoming remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setConnectionStatus('connected');
      } else {
        const inboundStream = new MediaStream();
        inboundStream.addTrack(event.track);
        setRemoteStream(inboundStream);
        setConnectionStatus('connected');
      }
    };

    // Send local ICE candidates to peer via WebSocket signaling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWsMessage({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON()
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setConnectionStatus('connected');
      } else if (state === 'disconnected') {
        setConnectionStatus('disconnected');
      } else if (state === 'failed') {
        setConnectionStatus('failed');
      }
    };

    return pc;
  }, [sendWsMessage]);

  // Join a room with local stream
  const joinMeeting = useCallback(async (
    targetRoomId: string,
    stream: MediaStream,
    role: 'signer' | 'hearing',
    userName: string = 'Participant'
  ) => {
    cleanup();
    setWebrtcError(null);
    setRoomId(targetRoomId);
    localStreamRef.current = stream;
    userInfoRef.current = { name: userName, role };
    setConnectionStatus('connecting');

    const wsUrl = getWebSocketUrl(targetRoomId);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsInMeeting(true);
        // Announce user status to room
        ws.send(JSON.stringify({
          type: 'peer-status',
          name: userName,
          role,
          isAudioMuted: !stream.getAudioTracks().some(t => t.enabled),
          isVideoMuted: !stream.getVideoTracks().some(t => t.enabled)
        }));
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;

          if (type === 'room-info') {
            setIsInitiator(data.isInitiator);
            setPeerCount(data.peerCount || 1);
            if (data.peerCount > 1) {
              setConnectionStatus('connecting');
            }
          } 
          else if (type === 'peer-joined') {
            setPeerCount(data.peerCount || 2);
            setConnectionStatus('connecting');

            // Peer joined: as the initiator, create offer
            if (localStreamRef.current) {
              const pc = createPeerConnection(localStreamRef.current);
              const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
              });
              await pc.setLocalDescription(offer);
              sendWsMessage({
                type: 'offer',
                offer: {
                  type: offer.type,
                  sdp: offer.sdp
                }
              });
            }
          } 
          else if (type === 'offer') {
            // Received offer: create answer
            if (localStreamRef.current) {
              const pc = createPeerConnection(localStreamRef.current);
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer || data));
              await flushIceCandidates();

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendWsMessage({
                type: 'answer',
                answer: {
                  type: answer.type,
                  sdp: answer.sdp
                }
              });

              // Also echo peer status
              sendWsMessage({
                type: 'peer-status',
                name: userInfoRef.current.name,
                role: userInfoRef.current.role,
                isAudioMuted: !localStreamRef.current.getAudioTracks().some(t => t.enabled),
                isVideoMuted: !localStreamRef.current.getVideoTracks().some(t => t.enabled)
              });
            }
          } 
          else if (type === 'answer') {
            // Received answer from remote peer
            const pc = pcRef.current;
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer || data));
              await flushIceCandidates();
            }
          } 
          else if (type === 'ice-candidate') {
            const pc = pcRef.current;
            if (data.candidate) {
              if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) {
                  console.warn('ICE Candidate error:', e);
                }
              } else {
                iceCandidateQueueRef.current.push(data.candidate);
              }
            }
          } 
          else if (type === 'peer-left') {
            setRemoteStream(null);
            setPeerCount(1);
            setConnectionStatus('idle');
          } 
          else if (type === 'peer-status') {
            setRemotePeerInfo(prev => ({
              ...prev,
              name: data.name || prev.name,
              role: data.role || prev.role,
              isAudioMuted: data.isAudioMuted ?? prev.isAudioMuted,
              isVideoMuted: data.isVideoMuted ?? prev.isVideoMuted
            }));
          } 
          else if (type === 'media-state') {
            setRemotePeerInfo(prev => ({
              ...prev,
              isAudioMuted: data.isAudioMuted ?? prev.isAudioMuted,
              isVideoMuted: data.isVideoMuted ?? prev.isVideoMuted
            }));
          } 
          else if (type === 'caption-update') {
            if (callbacksRef.current.onRemoteCaption) {
              callbacksRef.current.onRemoteCaption({
                text: data.text,
                confidence: data.confidence || 1.0,
                timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            }
          } 
          else if (type === 'stt-update') {
            if (callbacksRef.current.onRemoteStt) {
              callbacksRef.current.onRemoteStt({
                text: data.text,
                isFinal: data.isFinal ?? true,
                timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            }
          } 
          else if (type === 'chat-message') {
            if (callbacksRef.current.onRemoteChat && data.message) {
              callbacksRef.current.onRemoteChat(data.message);
            }
          }
        } catch (msgErr) {
          console.warn('Signaling message error:', msgErr);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket connection error:', e);
        setWebrtcError('Could not connect to signaling server. Ensure backend is running.');
        setConnectionStatus('failed');
      };

      ws.onclose = () => {
        setIsInMeeting(false);
      };

    } catch (err: any) {
      console.error('Join meeting error:', err);
      setWebrtcError(err.message || 'Failed to initialize meeting connection');
      setConnectionStatus('failed');
    }
  }, [cleanup, createPeerConnection, flushIceCandidates, sendWsMessage]);

  // Leave current meeting
  const leaveMeeting = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Broadcast live recognized sign-language caption
  const broadcastCaption = useCallback((text: string, confidence: number) => {
    sendWsMessage({
      type: 'caption-update',
      text,
      confidence,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }, [sendWsMessage]);

  // Broadcast spoken speech-to-text transcript
  const broadcastStt = useCallback((text: string, isFinal: boolean = true) => {
    sendWsMessage({
      type: 'stt-update',
      text,
      isFinal,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }, [sendWsMessage]);

  // Broadcast chat message
  const broadcastChatMessage = useCallback((msg: ChatMessage) => {
    sendWsMessage({
      type: 'chat-message',
      message: msg
    });
  }, [sendWsMessage]);

  // Broadcast mute/unmute state changes
  const broadcastMediaState = useCallback((isAudioMuted: boolean, isVideoMuted: boolean) => {
    sendWsMessage({
      type: 'media-state',
      isAudioMuted,
      isVideoMuted
    });
  }, [sendWsMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isInMeeting,
    roomId,
    isInitiator,
    peerCount,
    connectionStatus,
    remoteStream,
    remotePeerInfo,
    webrtcError,
    joinMeeting,
    leaveMeeting,
    broadcastCaption,
    broadcastStt,
    broadcastChatMessage,
    broadcastMediaState
  };
}
