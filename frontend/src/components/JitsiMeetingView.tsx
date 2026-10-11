import React, { useEffect, useRef, useState } from 'react';
import { Video, ShieldCheck, Sparkles, Loader2, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface JitsiMeetingViewProps {
  roomName: string;
  userName?: string;
  userRole?: 'signer' | 'hearing';
  onClose?: () => void;
}

export const JitsiMeetingView: React.FC<JitsiMeetingViewProps> = ({
  roomName,
  userName = 'SignConnect User',
  userRole = 'signer',
  onClose
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const jitsiApiRef = useRef<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadJitsiScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        const existingScript = document.getElementById('jitsi-external-api');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', (e) => reject(e));
          return;
        }

        const script = document.createElement('script');
        script.id = 'jitsi-external-api';
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Jitsi Meet API script. Check internet access.'));
        document.body.appendChild(script);
      });
    };

    loadJitsiScript()
      .then(() => {
        if (!isMounted || !containerRef.current) return;

        // Clean up previous instance if any
        if (jitsiApiRef.current) {
          jitsiApiRef.current.dispose();
          jitsiApiRef.current = null;
        }

        const domain = 'meet.jit.si';
        // Sanitize room name
        const cleanRoom = 'SignConnect-' + roomName.replace(/[^a-zA-Z0-9_-]/g, '');

        const options = {
          roomName: cleanRoom,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: {
            displayName: `${userName} (${userRole === 'signer' ? 'Deaf/Signer' : 'Hearing Peer'})`
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            defaultLanguage: 'en'
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'closedcaptions',
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'hangup',
              'chat',
              'settings',
              'raisehand',
              'videoquality',
              'filmstrip',
              'tileview'
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_REMOTE_DISPLAY_NAME: 'Meeting Peer'
          }
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;
        setLoading(false);

        api.addEventListener('videoConferenceLeft', () => {
          if (onClose) onClose();
        });

        api.addEventListener('readyToClose', () => {
          if (onClose) onClose();
        });
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err.message || 'Could not load Jitsi Meet. Please try WebRTC mode.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (e) {}
        jitsiApiRef.current = null;
      }
    };
  }, [roomName, userName, userRole, onClose]);

  return (
    <div className="relative w-full h-[620px] rounded-3xl overflow-hidden bento-card border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] bg-black/90 flex flex-col">
      {/* Top Bar Info */}
      <div className="p-3 px-5 bg-black/60 border-b border-white/10 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-display font-bold text-xs text-white">Jitsi Meet Cloud Room:</span>
          <span className="font-mono text-cyan-300 text-xs px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 font-bold">
            {roomName}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">End-to-End Encrypted SFU Room</span>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 space-y-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-sm font-semibold text-white">Connecting to Jitsi Meet Room...</p>
          <p className="text-xs text-slate-400">Preparing multi-device conference container</p>
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 space-y-4 p-6 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400" />
          <div>
            <h3 className="text-base font-bold text-white">Jitsi Connection Error</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">{loadError}</p>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl linear-btn-primary text-xs font-bold text-white"
          >
            Switch to WebRTC Direct Mode
          </button>
        </div>
      )}

      {/* Container where Jitsi iframe is mounted */}
      <div ref={containerRef} className="flex-1 w-full h-full bg-black" />
    </div>
  );
};
