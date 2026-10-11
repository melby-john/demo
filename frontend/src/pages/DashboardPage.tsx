import React, { useState, useEffect } from 'react';
import { 
  Video, 
  GraduationCap, 
  Volume2, 
  Camera, 
  Mic, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  BookOpen,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  Award,
  Grid,
  ShieldCheck,
  Activity,
  Zap,
  Play,
  Maximize2
} from 'lucide-react';
import { ModelStatus } from '../types';
import { NavTab } from '../components/Navbar';
import { DAILY_SIGNS, DailySignItem } from '../data/dailySigns';
import { useSpeech } from '../hooks/useSpeech';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
  modelStatus: ModelStatus | null;
  backendOnline: boolean;
  onRefreshStatus: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  modelStatus,
  backendOnline,
  onRefreshStatus
}) => {
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const { speak } = useSpeech();

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'camera' as any })
        .then(res => setCameraPermission(res.state as any))
        .catch(() => {});
      navigator.permissions.query({ name: 'microphone' as any })
        .then(res => setMicPermission(res.state as any))
        .catch(() => {});
    }
  }, []);

  const categories = ['ALL', 'Daily Needs & Food', 'Family & People', 'Politeness & Social', 'Actions & Movement'];

  const filteredSigns = selectedCategory === 'ALL'
    ? DAILY_SIGNS.slice(0, 8)
    : DAILY_SIGNS.filter(s => s.category === selectedCategory).slice(0, 8);

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* ============================================================== */}
      {/* BENTO GRID: ROW 1 (HERO & INTERACTIVE RADAR MOCKUP) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Bento Hero Card (8 Cols) */}
        <div className="lg:col-span-8 bento-card p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Ambient Spotlight inside Hero Bento */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-500/20 via-indigo-500/15 to-transparent blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-10 -mb-20 w-80 h-80 rounded-full bg-gradient-to-tr from-purple-500/15 via-blue-500/10 to-transparent blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-6">
            {/* Linear Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-cyan-300 text-xs font-semibold backdrop-blur-xl shadow-glow-cyan">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>Next-Generation Accessibility // ISL 2.0</span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] font-display">
                Break Every Barrier. <br />
                <span className="gradient-text-hero">Connect Every Voice.</span>
              </h1>
              <p className="text-slate-300 text-base sm:text-lg max-w-xl font-normal leading-relaxed">
                An intelligent real-time bridge unifying Indian Sign Language (ISL), 
                3D hand and facial landmark telemetry, neural speech recognition, and browser voice synthesis.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={() => onNavigate('live-meeting')}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-full linear-btn-primary text-white font-bold text-sm active:scale-95 transition"
              >
                <Video className="w-4 h-4" />
                <span>Launch Live Meeting</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>

              <button
                onClick={() => onNavigate('isl-dictionary')}
                className="flex items-center gap-2 px-5 py-3.5 rounded-full linear-btn-secondary text-slate-200 text-sm font-semibold active:scale-95 transition"
              >
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Browse 24 Signs</span>
              </button>

              <button
                onClick={() => onNavigate('train-model')}
                className="flex items-center gap-2 px-5 py-3.5 rounded-full linear-btn-secondary text-slate-200 text-sm font-semibold active:scale-95 transition"
              >
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <span>Train Model</span>
              </button>
            </div>
          </div>

          {/* Bottom Telemetry Bar */}
          <div className="relative z-10 pt-8 mt-8 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">Tracking Points</span>
              <span className="text-xl font-extrabold text-white font-display">21 Joints + Face</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">Canonical Signs</span>
              <span className="text-xl font-extrabold text-cyan-300 font-display">24 Essential</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">Inference Speed</span>
              <span className="text-xl font-extrabold text-indigo-300 font-display">&lt; 30 ms</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">Privacy</span>
              <span className="text-xl font-extrabold text-emerald-300 font-display">100% Local</span>
            </div>
          </div>
        </div>

        {/* Bento Interactive Preview Card (4 Cols) */}
        <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                Live HUD Viewfinder
              </span>
              <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                ACTIVE
              </span>
            </div>

            {/* Simulated Live Viewport */}
            <div className="relative aspect-video rounded-2xl bg-black/60 border border-white/10 overflow-hidden flex flex-col justify-between p-3.5 shadow-inner">
              <div className="flex items-center justify-between z-10">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/70 text-emerald-400 border border-emerald-500/30">
                  98.4% CONFIDENCE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/70 text-cyan-300 border border-cyan-500/30">
                  30 FPS
                </span>
              </div>

              {/* Viewfinder Target graphic */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                <div className="w-24 h-24 rounded-full border border-dashed border-cyan-400 animate-spin" style={{ animationDuration: '20s' }}></div>
                <div className="absolute w-12 h-12 rounded-full border border-cyan-300"></div>
              </div>

              {/* Live Caption Tag Overlay */}
              <div className="z-10 bg-gradient-to-r from-cyan-500/90 to-blue-600/90 text-white px-3 py-1.5 rounded-xl text-center shadow-glow-cyan backdrop-blur-md">
                <span className="text-xs font-black tracking-wide font-display">"THANK YOU"</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Head Anchors:</span>
                <span className="text-emerald-300 font-semibold font-mono">Forehead, Chin, Mouth OK</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Speech Audio:</span>
                <span className="text-cyan-300 font-semibold font-mono">Synthesizer Armed</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08]">
            <button
              onClick={() => onNavigate('live-meeting')}
              className="w-full py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-cyan-300 hover:text-white border border-white/10 text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Enter Meeting Room</span>
            </button>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* BENTO GRID: ROW 2 (3 SYSTEM DIAGNOSTICS & TELEMETRY CARDS) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Engine 1: ML Model Engine */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Layers className="w-4 h-4" />
              </div>
              <button
                onClick={onRefreshStatus}
                title="Refresh Status"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <h2 className="text-base font-bold text-white font-display">Random Forest ML</h2>
              <p className="text-xs text-slate-400 mt-0.5">100 Trees &bull; 126D Vector Geometry</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Model Status:</span>
                <span className="text-emerald-400 font-semibold">{modelStatus?.ready ? 'Trained & Active' : 'Fallback Rules'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Active Classes:</span>
                <span className="text-cyan-300 font-mono font-bold">{modelStatus?.classes?.length || 27} Signs</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-white/[0.08]">
            <button
              onClick={() => onNavigate('train-model')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              <span>Train custom gestures</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Engine 2: Camera & Vision Sensor */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Camera className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                cameraPermission === 'granted'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                {cameraPermission === 'granted' ? 'CONNECTED' : 'STANDBY'}
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-white font-display">MediaPipe 3D Vision</h2>
              <p className="text-xs text-slate-400 mt-0.5">Dual Hand + Face Mesh Occlusion Retention</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">FPS Target:</span>
                <span className="text-indigo-300 font-mono font-bold">30 FPS In-Browser</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Processing:</span>
                <span className="text-slate-200">WebAssembly / WebGL</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-white/[0.08]">
            <button
              onClick={() => onNavigate('live-meeting')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <span>Test camera stream</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Engine 3: Two-Way Speech & Accessibility */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300">
                WEB SPEECH API
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-white font-display">Bidirectional Speech</h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time Voice Synthesis & Audio STT</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Voice Synthesis:</span>
                <span className="text-emerald-400 font-semibold">Active & Auditory</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">STT Captions:</span>
                <span className="text-purple-300 font-semibold">Browser Native</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-white/[0.08]">
            <button
              onClick={() => onNavigate('speech-text')}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
            >
              <span>Open speech studio</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* BENTO GRID: ROW 3 (24 DAILY ESSENTIAL SIGNS PREVIEW SHOWCASE) */}
      {/* ============================================================== */}
      <div className="bento-card p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xl font-extrabold text-white font-display tracking-tight">
                Daily Essential Sign Language Gallery
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              All 24 gestures with visual guidance, movement breakdowns, and head/face anchor tracking.
            </p>
          </div>

          <button
            onClick={() => onNavigate('isl-dictionary')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-cyan-300 border border-white/10 text-xs font-bold transition w-fit"
          >
            <span>View All 24 Cards</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.08]">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow-cyan'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 8 Sign Flashcards Preview Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {filteredSigns.map(item => (
            <div
              key={item.id}
              className="glass-card rounded-2xl p-3 flex flex-col justify-between group hover:border-cyan-400/50 hover:shadow-glow-cyan transition"
            >
              <div className="relative aspect-square rounded-xl bg-black/60 p-2 flex items-center justify-center overflow-hidden mb-2.5">
                <img
                  src={item.image}
                  alt={item.title}
                  className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-2 py-0.5 rounded-md bg-black/80 text-cyan-300 border border-white/10">
                  {item.category}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors font-display">
                    {item.title}
                  </h3>
                  <button
                    onClick={() => speak(item.title)}
                    className="p-1 rounded-md text-slate-400 hover:text-white transition"
                    title="Speak word"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1">{item.meaning}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
