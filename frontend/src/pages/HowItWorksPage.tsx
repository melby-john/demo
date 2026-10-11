import React from 'react';
import { 
  Camera, 
  Hand, 
  Cpu, 
  Layers, 
  MessageSquare, 
  Volume2, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Enable Local Camera',
      desc: 'Camera feed is captured using the browser MediaDevices API with strict user consent. Video frames remain strictly on your local device.',
      icon: Camera,
      tech: 'Browser MediaDevices API'
    },
    {
      num: '02',
      title: 'Extract 3D Hand Landmarks',
      desc: 'MediaPipe Tasks Vision processes each frame in WebAssembly/GPU, detecting 21 landmarks per hand with (x, y, z) normalized coordinates.',
      icon: Hand,
      tech: 'MediaPipe Tasks Vision (21 Keypoints)'
    },
    {
      num: '03',
      title: 'Scale & Wrist Normalization',
      desc: 'Raw landmarks are centered at the wrist (landmark 0) and scaled by palm span, creating a 126-dimensional translation-invariant feature vector.',
      icon: Layers,
      tech: 'Spatial Coordinate Invariance'
    },
    {
      num: '04',
      title: 'Random Forest Inference',
      desc: 'FastAPI sends feature vectors to an ensemble of 100 decision trees trained with scikit-learn. Output yields probabilities and confidence scores.',
      icon: Cpu,
      tech: 'FastAPI + scikit-learn (joblib)'
    },
    {
      num: '05',
      title: 'Confidence & Smoothing Filter',
      desc: 'Predictions passing a configurable confidence threshold (e.g. 70%) are temporally smoothed to prevent jitter or repeated false triggers.',
      icon: Zap,
      tech: 'Threshold & Cooldown Filtering'
    },
    {
      num: '06',
      title: 'Captions & Voice Synthesis',
      desc: 'Recognized signs appear in live meeting captions. Signers can confirm, edit, and read messages aloud using Web SpeechSynthesis.',
      icon: Volume2,
      tech: 'Web Speech API (TTS & STT)'
    }
  ];

  return (
    <div className="space-y-10 animate-fade-in max-w-5xl mx-auto pb-16 font-sans">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Technical Pipeline & Architecture</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
          How SignConnect AI <span className="gradient-text-cyan">Works</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
          Understanding the end-to-end pipeline connecting Indian Sign Language (ISL) hand tracking, 
          geometric landmark heuristics, machine learning classification, and bidirectional speech synthesis.
        </p>
      </div>

      {/* Visual Pipeline Architecture Diagram */}
      <div className="p-7 sm:p-9 rounded-3xl glass-panel shadow-2xl space-y-6">
        <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span>System Architecture & Data Flow</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          
          {/* Box 1: Frontend Client */}
          <div className="p-6 rounded-2xl glass-card border border-cyan-500/30 space-y-3.5 hover:shadow-glow-cyan transition">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 text-sm font-display">Frontend Client</span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-mono border border-cyan-500/30">React + Vite</span>
            </div>
            <ul className="space-y-2.5 text-slate-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Webcam stream (MediaDevices)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                MediaPipe Vision (21 landmarks)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Canvas skeleton rendering
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Web Speech TTS / STT
              </li>
            </ul>
          </div>

          {/* Box 2: REST Interface */}
          <div className="p-6 rounded-2xl glass-card border border-blue-500/30 space-y-3.5 flex flex-col justify-between hover:shadow-glow-blue transition">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <span className="font-bold text-blue-300 text-sm font-display">Communication</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 text-[10px] font-mono border border-blue-500/30">REST JSON</span>
              </div>
              <ul className="space-y-2.5 text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  POST /api/model/predict
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  POST /api/dataset/samples
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  POST /api/model/train
                </li>
              </ul>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[11px] text-cyan-300 text-center font-mono">
              Payload: 126 floats (landmarks)
            </div>
          </div>

          {/* Box 3: ML Backend */}
          <div className="p-6 rounded-2xl glass-card border border-purple-500/30 space-y-3.5 hover:shadow-glow-purple transition">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-300 text-sm font-display">ML Backend</span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-mono border border-purple-500/30">FastAPI</span>
            </div>
            <ul className="space-y-2.5 text-slate-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                Feature extraction & normalization
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                Random Forest (100 trees)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                Persistent storage (joblib)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                dataset.json sample storage
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* 6 Step Detailed Pipeline */}
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-white tracking-tight font-display">
          Step-by-Step Execution Workflow
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <div 
                key={step.num}
                className="p-6 rounded-3xl glass-card flex flex-col justify-between hover:border-cyan-400/50 hover:shadow-glow-cyan transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-extrabold text-cyan-400 font-display group-hover:scale-105 transition-transform">
                      {step.num}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-base font-display">{step.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">{step.desc}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-white/[0.08]">
                  <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                    {step.tech}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distinction: Implemented vs Planned Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        
        {/* Implemented in MVP */}
        <div className="p-7 rounded-3xl glass-panel border border-emerald-500/30 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5 text-emerald-300 font-bold text-base font-display">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Currently Implemented MVP Features</span>
          </div>
          <ul className="space-y-3 text-xs text-slate-300 font-normal">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
              <span><strong>MediaPipe Browser Vision:</strong> Local real-time tracking of 21 3D landmarks for 1 or 2 hands and face anchors.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
              <span><strong>Translation & Scale Invariant Features:</strong> 126-dimensional normalized geometric vectors.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
              <span><strong>FastAPI + Scikit-Learn:</strong> Real Random Forest training, persistence via joblib, and live inference.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
              <span><strong>Data Collector Tool:</strong> Live webcam dataset recording with label grouping and verification.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
              <span><strong>Bidirectional Voice:</strong> Web SpeechSynthesis (TTS) and Web SpeechRecognition (STT).</span>
            </li>
          </ul>
        </div>

        {/* Planned for Future Versions */}
        <div className="p-7 rounded-3xl glass-panel border border-purple-500/30 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5 text-purple-300 font-bold text-base font-display">
            <Clock className="w-5 h-5 text-purple-400" />
            <span>Planned Post-Hackathon Enhancements</span>
          </div>
          <ul className="space-y-3 text-xs text-slate-300 font-normal">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0"></span>
              <span><strong>Temporal Sequence Modeling:</strong> Recurrent LSTM / Transformer models for dynamic multi-frame continuous signs.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0"></span>
              <span><strong>3D Avatar Signer:</strong> Synthesizing spoken English into animated 3D ISL avatar gestures.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0"></span>
              <span><strong>Full Body Holistic Tracking:</strong> Incorporating facial expressions and shoulder posture for ISL grammar nuances.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0"></span>
              <span><strong>Multi-Party Video Rooms:</strong> WebRTC peer-to-peer group calls with synchronized subtitles.</span>
            </li>
          </ul>
        </div>

      </div>

    </div>
  );
};
