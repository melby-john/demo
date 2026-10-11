import { useState, useRef, useEffect, useCallback } from 'react';
import { FilesetResolver, HandLandmarker, FaceLandmarker } from '@mediapipe/tasks-vision';
import { LandmarkPoint, FaceKeypoints } from '../types';
import { drawTrackingOverlays } from '../utils/handDrawing';

interface UseHandLandmarkerOptions {
  mirror?: boolean;
  onHandsDetected?: (hands: LandmarkPoint[][], face?: FaceKeypoints | null, rawFaceLandmarks?: LandmarkPoint[]) => void;
  enableFace?: boolean;
  enableAudio?: boolean;
  enableTracking?: boolean;
}

export function useHandLandmarker(options: UseHandLandmarkerOptions = {}) {
  const { 
    mirror = true, 
    onHandsDetected, 
    enableFace = true,
    enableAudio = false,
    enableTracking = true 
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastKnownFaceRef = useRef<FaceKeypoints | null>(null);
  const lastKnownRawFaceRef = useRef<LandmarkPoint[]>([]);
  const lastFaceTimeRef = useRef<number>(0);

  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [isFaceReady, setIsFaceReady] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraPaused, setIsCameraPaused] = useState<boolean>(false);
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isTrackingActive, setIsTrackingActive] = useState<boolean>(enableTracking);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedHands, setDetectedHands] = useState<LandmarkPoint[][]>([]);
  const [detectedFace, setDetectedFace] = useState<FaceKeypoints | null>(null);

  const isTrackingActiveRef = useRef<boolean>(enableTracking);
  useEffect(() => {
    isTrackingActiveRef.current = isTrackingActive;
  }, [isTrackingActive]);

  // Initialize MediaPipe HandLandmarker and FaceLandmarker
  const initLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;

    setIsLoadingModel(true);
    setError(null);

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      // 1. Hand Landmarker
      try {
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2
        });
        landmarkerRef.current = handLandmarker;
      } catch (gpuHandErr) {
        console.warn('GPU hand delegate failed, attempting CPU delegate fallback:', gpuHandErr);
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numHands: 2
        });
        landmarkerRef.current = handLandmarker;
      }

      setIsModelReady(true);

      // 2. Face Landmarker (Enables face-dependent signs: eat, drink, thank you, water, mom, dad)
      if (enableFace) {
        try {
          const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numFaces: 1
          });
          faceLandmarkerRef.current = faceLandmarker;
          setIsFaceReady(true);
        } catch (gpuFaceErr) {
          console.warn('GPU face delegate failed, trying CPU fallback:', gpuFaceErr);
          try {
            const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                delegate: 'CPU'
              },
              runningMode: 'VIDEO',
              numFaces: 1
            });
            faceLandmarkerRef.current = faceLandmarker;
            setIsFaceReady(true);
          } catch (cpuFaceErr) {
            console.warn('Could not initialize FaceLandmarker:', cpuFaceErr);
          }
        }
      }

      setIsLoadingModel(false);
      return landmarkerRef.current;
    } catch (err: any) {
      console.error('Failed to initialize MediaPipe models:', err);
      setError('Failed to load MediaPipe tracking models. Check internet connectivity.');
      setIsLoadingModel(false);
      return null;
    }
  }, [enableFace]);

  // Keep latest callbacks and settings in refs to avoid stale closures in animation loop
  const onHandsDetectedRef = useRef(onHandsDetected);
  onHandsDetectedRef.current = onHandsDetected;

  const mirrorRef = useRef(mirror);
  mirrorRef.current = mirror;

  // Frame processing loop
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const handLandmarker = landmarkerRef.current;
    const faceLandmarker = faceLandmarkerRef.current;

    if (!video || !canvas || !handLandmarker || video.paused || video.ended) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;

      // Adjust canvas resolution to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      try {
        const startTimeMs = performance.now();
        const handResults = handLandmarker.detectForVideo(video, startTimeMs);

        const hands: LandmarkPoint[][] = [];
        if (handResults && handResults.landmarks && handResults.landmarks.length > 0) {
          handResults.landmarks.forEach(rawLandmarks => {
            const formatted: LandmarkPoint[] = rawLandmarks.map(p => ({
              x: p.x,
              y: p.y,
              z: p.z ?? 0
            }));
            hands.push(formatted);
          });
        }

        setDetectedHands(hands);

        // Detect Face Landmarks if ready
        let currentFace: FaceKeypoints | null = null;
        let rawFacePoints: LandmarkPoint[] = [];

        if (faceLandmarker) {
          try {
            const faceResults = faceLandmarker.detectForVideo(video, startTimeMs);
            if (faceResults && faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
              const faceLms = faceResults.faceLandmarks[0];
              rawFacePoints = faceLms.map(p => ({
                x: p.x,
                y: p.y,
                z: p.z ?? 0
              }));

              // Extract key anchors (forehead, mouth, chin, nose)
              const forehead = faceLms[10] || faceLms[151] || faceLms[9];
              const nose = faceLms[1] || faceLms[4];
              const mouthTop = faceLms[13] || faceLms[0];
              const mouthBottom = faceLms[14] || faceLms[17];
              const chin = faceLms[152] || faceLms[175];
              const leftCheek = faceLms[234] || faceLms[50];
              const rightCheek = faceLms[454] || faceLms[280];

              currentFace = {
                forehead: { x: forehead.x, y: forehead.y, z: forehead.z ?? 0 },
                nose: { x: nose.x, y: nose.y, z: nose.z ?? 0 },
                mouth: {
                  x: (mouthTop.x + mouthBottom.x) / 2,
                  y: (mouthTop.y + mouthBottom.y) / 2,
                  z: ((mouthTop.z ?? 0) + (mouthBottom.z ?? 0)) / 2
                },
                chin: { x: chin.x, y: chin.y, z: chin.z ?? 0 },
                leftCheek: { x: leftCheek.x, y: leftCheek.y, z: leftCheek.z ?? 0 },
                rightCheek: { x: rightCheek.x, y: rightCheek.y, z: rightCheek.z ?? 0 }
              };
            }
          } catch (faceErr) {
            // Non-fatal, continue with hands
          }
        }

        if (currentFace) {
          lastKnownFaceRef.current = currentFace;
          lastKnownRawFaceRef.current = rawFacePoints;
          lastFaceTimeRef.current = performance.now();
        } else if (lastKnownFaceRef.current && (performance.now() - lastFaceTimeRef.current < 3000)) {
          // Hand occluding face while touching chin/mouth/forehead: retain recent face anchors
          currentFace = lastKnownFaceRef.current;
          rawFacePoints = lastKnownRawFaceRef.current;
        }

        setDetectedFace(currentFace);

        // Draw hands and face anchors on canvas if tracking is enabled
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (isTrackingActiveRef.current && isVideoEnabled) {
            drawTrackingOverlays(ctx, hands, currentFace, canvas.width, canvas.height, mirrorRef.current);
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }

        if (onHandsDetectedRef.current && isTrackingActiveRef.current) {
          onHandsDetectedRef.current(hands, currentFace, rawFacePoints);
        }
      } catch (err) {
        console.warn('Frame detection error:', err);
      }
    }

    animFrameIdRef.current = requestAnimationFrame(processFrame);
  }, [isVideoEnabled]);

  // Keep video element attached to the active stream continuously
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  });

  // Start Camera
  const startCamera = async (): Promise<MediaStream | null> => {
    setError(null);
    try {
      // If we already have an active stream with live tracks, attach and reuse it
      if (streamRef.current && streamRef.current.active && streamRef.current.getVideoTracks().some(t => t.readyState === 'live')) {
        const stream = streamRef.current;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setIsCameraActive(true);
        setIsCameraPaused(false);
        setIsVideoEnabled(true);
        return stream;
      }

      // 1. Immediately request camera so user SEES THEIR FACE IN MILLISECONDS
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: enableAudio ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } : false
        });
      } catch (mediaWithAudioErr) {
        console.warn('Microphone + Camera combined request failed, falling back to camera only:', mediaWithAudioErr);
        // Fallback to video only so user's face is NEVER blocked if mic is unavailable
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });
      }

      streamRef.current = stream;
      setLocalStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Initial video play warning:', playErr);
        }
      }

      setIsCameraActive(true);
      setIsCameraPaused(false);
      setIsMicEnabled(stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled);
      setIsVideoEnabled(true);

      // 2. Initialize MediaPipe models in the background without blocking camera preview
      initLandmarker().then((landmarker) => {
        if (landmarker && animFrameIdRef.current === null) {
          animFrameIdRef.current = requestAnimationFrame(processFrame);
        }
      }).catch((lmErr) => {
        console.warn('MediaPipe tracking initialization warning (video stream is still active):', lmErr);
      });

      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      animFrameIdRef.current = requestAnimationFrame(processFrame);
      return stream;
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser address bar.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera device detected on your system.');
      } else {
        setError(err.message || 'Unable to access camera feed.');
      }
      setIsCameraActive(false);
      return null;
    }
  };

  // Toggle Microphone Mute/Unmute
  const toggleMic = (enabled?: boolean): boolean => {
    if (!streamRef.current) return false;
    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length === 0) return false;
    const nextState = enabled !== undefined ? enabled : !isMicEnabled;
    audioTracks.forEach(track => {
      track.enabled = nextState;
    });
    setIsMicEnabled(nextState);
    return nextState;
  };

  // Toggle Video Camera On/Off
  const toggleVideo = (enabled?: boolean): boolean => {
    if (!streamRef.current) return false;
    const videoTracks = streamRef.current.getVideoTracks();
    if (videoTracks.length === 0) return false;
    const nextState = enabled !== undefined ? enabled : !isVideoEnabled;
    videoTracks.forEach(track => {
      track.enabled = nextState;
    });
    setIsVideoEnabled(nextState);
    if (!nextState && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    return nextState;
  };

  // Toggle Tracking HUD on/off
  const toggleTracking = (active?: boolean): boolean => {
    const nextState = active !== undefined ? active : !isTrackingActive;
    setIsTrackingActive(nextState);
    if (!nextState && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    return nextState;
  };

  // Pause Camera
  const pauseCamera = () => {
    if (videoRef.current && isCameraActive) {
      if (isCameraPaused) {
        videoRef.current.play();
        setIsCameraPaused(false);
      } else {
        videoRef.current.pause();
        setIsCameraPaused(true);
      }
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    setLocalStream(null);
    setDetectedHands([]);
    setDetectedFace(null);
    setIsCameraActive(false);
    setIsCameraPaused(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    localStream,
    isCameraActive,
    isCameraPaused,
    isMicEnabled,
    isVideoEnabled,
    isTrackingActive,
    isLoadingModel,
    isModelReady,
    isFaceReady,
    detectedHands,
    detectedFace,
    error,
    startCamera,
    stopCamera,
    pauseCamera,
    toggleMic,
    toggleVideo,
    toggleTracking
  };
}
