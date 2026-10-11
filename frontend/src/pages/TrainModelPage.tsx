import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  VideoOff,
  CircleDot,
  Square,
  Trash2,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  Award,
  Database,
  ArrowRight,
  Activity
} from 'lucide-react';
import { useHandLandmarker } from '../hooks/useHandLandmarker';
import { apiService } from '../services/api';
import { ModelStatus, DatasetSummary, TrainingResult, AppSettings, LandmarkPoint } from '../types';
import { DAILY_SIGNS } from '../data/dailySigns';

interface TrainModelPageProps {
  settings: AppSettings;
  modelStatus: ModelStatus | null;
  backendOnline: boolean;
  onRefreshStatus: () => void;
  onNavigateToLive: () => void;
  initialSignLabel?: string;
}

export const TrainModelPage: React.FC<TrainModelPageProps> = ({
  settings,
  modelStatus,
  backendOnline,
  onRefreshStatus,
  onNavigateToLive,
  initialSignLabel = ''
}) => {
  const [signLabel, setSignLabel] = useState<string>(initialSignLabel);

  useEffect(() => {
    if (initialSignLabel) {
      setSignLabel(initialSignLabel);
    }
  }, [initialSignLabel]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBatchCount, setRecordedBatchCount] = useState<number>(0);
  const recordedSamplesBuffer = useRef<Array<{ label: string; landmarks?: LandmarkPoint[]; hands?: LandmarkPoint[][] }>>([]);

  const [datasetSummary, setDatasetSummary] = useState<DatasetSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);

  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch dataset summary
  const fetchSummary = useCallback(async () => {
    if (!backendOnline) return;
    setIsLoadingSummary(true);
    try {
      const summary = await apiService.getDatasetSummary();
      setDatasetSummary(summary);
    } catch (err: any) {
      console.warn('Failed to load dataset summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [backendOnline]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const isRecordingRef = useRef<boolean>(false);
  const signLabelRef = useRef<string>(signLabel);
  const lastSampleTimeRef = useRef<number>(0);

  // Keep refs in sync synchronously
  isRecordingRef.current = isRecording;
  signLabelRef.current = signLabel;

  // Hands & Face detection callback during sample recording
  const handleHandsDetected = useCallback((
    hands: LandmarkPoint[][],
    face?: any,
    rawFacePoints?: LandmarkPoint[]
  ) => {
    if (!isRecordingRef.current) return;
    const currentLabel = signLabelRef.current.trim().toLowerCase();
    if (!currentLabel || !hands || hands.length === 0) return;

    // Throttle capture to ~20 fps (every 50ms) to ensure clean samples without flooding
    const now = performance.now();
    if (now - lastSampleTimeRef.current < 50) return;
    lastSampleTimeRef.current = now;

    // Buffer sample frame
    const sample = {
      label: currentLabel,
      landmarks: hands[0],
      hands: hands,
      face: face || undefined,
      faceLandmarks: rawFacePoints && rawFacePoints.length > 0 ? rawFacePoints : undefined
    };

    recordedSamplesBuffer.current.push(sample);
    setRecordedBatchCount(recordedSamplesBuffer.current.length);
  }, []);

  // Hook for hand & face tracking & camera
  const {
    videoRef,
    canvasRef,
    isCameraActive,
    detectedHands,
    detectedFace,
    error: cameraError,
    startCamera,
    stopCamera
  } = useHandLandmarker({
    mirror: settings.mirrorCamera,
    onHandsDetected: handleHandsDetected,
    enableFace: true
  });

  // Start Recording
  const handleStartRecording = () => {
    const trimmed = signLabel.trim();
    if (!trimmed) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a sign label before recording (e.g. "hello" or "thank_you").' });
      return;
    }
    if (!isCameraActive) {
      setFeedbackMsg({ type: 'error', text: 'Please start the camera before recording.' });
      return;
    }

    recordedSamplesBuffer.current = [];
    lastSampleTimeRef.current = 0;
    setRecordedBatchCount(0);
    isRecordingRef.current = true;
    setIsRecording(true);
    setFeedbackMsg(null);
  };

  // Stop Recording and upload samples to backend
  const handleStopRecording = async () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    const count = recordedSamplesBuffer.current.length;

    if (count === 0) {
      setFeedbackMsg({ type: 'error', text: 'No frames captured. Ensure your hand is clearly visible in the camera frame.' });
      return;
    }

    try {
      setFeedbackMsg(null);
      const res = await apiService.addSamples(recordedSamplesBuffer.current);
      setRecordedBatchCount(0);
      recordedSamplesBuffer.current = [];
      setDatasetSummary(res.summary);
      setFeedbackMsg({
        type: 'success',
        text: `Successfully saved ${res.added_count} samples for sign "${signLabel.trim().toLowerCase()}". You can now train the model or add more signs!`
      });
      onRefreshStatus();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to upload recorded samples.' });
    }
  };

  // Delete samples by label
  const handleDeleteLabel = async (label: string) => {
    if (!confirm(`Delete all recorded samples for "${label}"?`)) return;
    try {
      const res = await apiService.deleteSamples(label);
      setDatasetSummary(res.summary);
      setFeedbackMsg({ type: 'success', text: `Removed ${res.deleted_count} samples for "${label}".` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to delete samples.' });
    }
  };

  // Reset default benchmark dataset
  const handleResetDefault = async () => {
    if (!confirm('Reset dataset to default canonical & daily essential signs (27 signs) and retrain model?')) return;
    try {
      setIsTraining(true);
      const res = await apiService.resetDefaultDataset();
      await fetchSummary();
      onRefreshStatus();
      setFeedbackMsg({ type: 'success', text: res.message });
      setTrainingResult(res.training);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to reset default dataset.' });
    } finally {
      setIsTraining(false);
    }
  };

  // Clear all samples
  const handleClearAll = async () => {
    if (!confirm('Clear ALL recorded dataset samples? This cannot be undone.')) return;
    try {
      const res = await apiService.deleteSamples();
      setDatasetSummary(res.summary);
      setFeedbackMsg({ type: 'success', text: `Cleared ${res.deleted_count} samples.` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to clear dataset.' });
    }
  };

  // Trigger Model Training
  const handleTrainModel = async () => {
    setTrainingError(null);
    setTrainingResult(null);

    // Frontend validation
    if (!datasetSummary || datasetSummary.label_count < 2) {
      setTrainingError('Training requires samples for at least 2 different sign labels.');
      return;
    }

    const labelsWithTooFew = Object.entries(datasetSummary.labels).filter(([_, count]) => count < 3);
    if (labelsWithTooFew.length > 0) {
      setTrainingError(`Sign "${labelsWithTooFew[0][0]}" has only ${labelsWithTooFew[0][1]} samples. Please record at least 3 samples per sign.`);
      return;
    }

    setIsTraining(true);
    try {
      const result = await apiService.trainModel();
      setTrainingResult(result);
      onRefreshStatus();
      setFeedbackMsg({
        type: 'success',
        text: `Model trained successfully! Test Accuracy: ${(result.accuracy * 100).toFixed(1)}%.`
      });
    } catch (err: any) {
      setTrainingError(err.message || 'Training failed.');
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16 font-sans">

      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>ML Studio & Model Trainer</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          Train Custom <span className="gradient-text-cyan">ISL AI Model</span>
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
          Record landmark training sets in real time with your webcam and train a Random Forest classifier.
          Feature vectors and label encoders are serialized with joblib on the local backend.
        </p>
      </div>

      {/* Notification Banner */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-medium border backdrop-blur-xl animate-fade-in ${feedbackMsg.type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 shadow-glow-cyan'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">

        {/* Left Column: Data Collector Preview & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Camera View */}
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden glass-card border border-white/10 shadow-2xl flex items-center justify-center bg-navy-950/80">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${settings.mirrorCamera ? 'scale-x-[-1]' : ''} ${isCameraActive ? 'block' : 'hidden'
                }`}
            />

            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${isCameraActive ? 'block' : 'hidden'
                }`}
            />

            {/* Viewfinder Corner Overlays */}
            {isCameraActive && (
              <>
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400/60 rounded-tl-lg pointer-events-none" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400/60 rounded-tr-lg pointer-events-none" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-lg pointer-events-none" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-400/60 rounded-br-lg pointer-events-none" />
              </>
            )}

            {!isCameraActive && (
              <div className="text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto shadow-inner">
                  <VideoOff className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="text-lg font-bold text-white font-display">Camera Standby</h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Activate camera feed to track hand landmarks and capture custom training samples.
                </p>
                <button
                  onClick={startCamera}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-white font-bold text-xs transition shadow-glow-cyan active:scale-95"
                >
                  Start Camera Feed
                </button>
              </div>
            )}

            {/* Recording Active HUD */}
            {isRecording && (
              <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
                <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-rose-600/90 text-white text-xs font-bold animate-pulse backdrop-blur-xl border border-rose-400/40 shadow-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm"></span>
                  RECORDING: {recordedBatchCount} frames
                </div>
                <span className="px-3 py-1.5 rounded-full bg-navy-950/80 text-cyan-300 text-xs border border-cyan-500/30 font-mono backdrop-blur-xl">
                  Sign: "{signLabel}"
                </span>
              </div>
            )}

            {isCameraActive && !isRecording && (
              <div className="absolute top-4 left-4 text-xs text-slate-200 px-3 py-1 rounded-full bg-navy-950/70 border border-white/15 backdrop-blur-md flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>{detectedHands.length > 0 ? `${detectedHands.length} Hand(s) Visible` : 'Ready — Place Hand in Frame'}</span>
              </div>
            )}
          </div>

          {/* Recording Controls Card */}
          <div className="p-6 rounded-3xl glass-panel space-y-5 shadow-xl">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Record Sign Gesture Samples</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sign Label (Gloss Identifier)
                </label>
                <input
                  type="text"
                  value={signLabel}
                  disabled={isRecording}
                  onChange={(e) => setSignLabel(e.target.value)}
                  placeholder="e.g. toilet, eat, thank_you, water, dad, mom"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white placeholder-slate-500 focus:border-cyan-400 transition"
                />

                {/* Quick Daily Sign Selector Chips */}
                <div className="pt-3">
                  <span className="text-[10px] text-slate-400 font-semibold block mb-1.5 uppercase tracking-wider">
                    Quick Pick from 24 Essential Signs:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {DAILY_SIGNS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSignLabel(s.slug)}
                        disabled={isRecording}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${signLabel === s.slug
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow-cyan'
                          : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
                          }`}
                      >
                        {s.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {!isRecording ? (
                  <button
                    onClick={handleStartRecording}
                    disabled={!isCameraActive || !signLabel.trim()}
                    className="flex-1 min-w-[170px] py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-glow-cyan transition active:scale-95"
                  >
                    <CircleDot className="w-4 h-4 text-white" />
                    <span>Record Samples</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopRecording}
                    className="flex-1 min-w-[170px] py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-rose-600/30 active:scale-95"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Stop Recording & Save ({recordedBatchCount})</span>
                  </button>
                )}

                <button
                  onClick={isCameraActive ? stopCamera : startCamera}
                  className="px-5 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 text-xs font-semibold transition active:scale-95"
                >
                  {isCameraActive ? 'Turn Off Cam' : 'Turn On Cam'}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
                <strong className="text-cyan-400">Recording Tip:</strong> While recording, hold the sign shape and slightly rotate your hand or move closer and further to capture natural variation. We recommend capturing 15–30 frames per sign.
              </p>
            </div>
          </div>

        </div>

        {/* Right Column: Dataset Summary & Train Model Trigger (5 cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Dataset Summary Card */}
          <div className="p-6 rounded-3xl glass-panel space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white font-display">Dataset Summary</h2>
                <p className="text-[11px] text-slate-400">backend/app/data/dataset.json</p>
              </div>
              <button
                onClick={fetchSummary}
                disabled={isLoadingSummary}
                title="Refresh summary"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingSummary ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl glass-card border border-cyan-500/20">
                <span className="text-[11px] text-slate-400 block font-medium">Total Samples</span>
                <span className="text-3xl font-extrabold text-cyan-400 font-display mt-1 block">
                  {datasetSummary?.total_samples || 0}
                </span>
              </div>
              <div className="p-4 rounded-2xl glass-card border border-purple-500/20">
                <span className="text-[11px] text-slate-400 block font-medium">Distinct Signs</span>
                <span className="text-3xl font-extrabold text-purple-400 font-display mt-1 block">
                  {datasetSummary?.label_count || 0}
                </span>
              </div>
            </div>

            {/* Labels breakdown */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {datasetSummary && datasetSummary.labels && Object.keys(datasetSummary.labels).length > 0 ? (
                Object.entries(datasetSummary.labels).map(([lbl, count]) => (
                  <div
                    key={lbl}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 text-xs transition"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 capitalize">{lbl.replace('_', ' ')}</span>
                      <span className="ml-2 text-[10px] text-cyan-400 font-mono">({count} samples)</span>
                    </div>
                    <button
                      onClick={() => handleDeleteLabel(lbl)}
                      title={`Delete ${lbl}`}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  No samples recorded yet. Enter a sign label on the left to start collecting.
                </div>
              )}
            </div>

            {/* Dataset bulk utilities */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
              <button
                onClick={handleResetDefault}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Seed Canonical Signs (27 Signs)</span>
              </button>
              <button
                onClick={handleClearAll}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Model Training Trigger Card */}
          <div className="p-6 rounded-3xl glass-card border border-indigo-500/25 space-y-5 shadow-2xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-display">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Train Random Forest Classifier</span>
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              Trains 100 decision trees on 126-dimensional scale- and translation-invariant landmark feature vectors.
            </p>

            {trainingError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 backdrop-blur-md">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{trainingError}</span>
              </div>
            )}

            <button
              onClick={handleTrainModel}
              disabled={isTraining || !backendOnline || (datasetSummary?.label_count ?? 0) < 2}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-40 text-white font-bold text-sm shadow-glow-indigo transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Layers className="w-4 h-4" />
              <span>{isTraining ? 'Training Random Forest...' : 'Train Model on Dataset'}</span>
            </button>

            {/* Training Result Display */}
            {trainingResult && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 text-xs backdrop-blur-xl animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>{trainingResult.message}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Test Accuracy</span>
                    <span className="text-lg font-bold text-emerald-300 font-display">
                      {(trainingResult.accuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Trained Signs</span>
                    <span className="text-lg font-bold text-white font-display">
                      {trainingResult.classes.length} classes
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={onNavigateToLive}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-navy-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <span>Test in Live Meeting</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300">Prototype Disclaimer:</span>
              <p>
                Models trained on webcam samples in a single lighting setup are prototypes designed for demonstration. Real-world deployment requires diverse signer demographics and lighting conditions.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
