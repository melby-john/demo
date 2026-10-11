import React from 'react';
import { 
  Sparkles, 
  Heart, 
  ShieldCheck, 
  Lock, 
  Users, 
  Globe, 
  Code2, 
  Award,
  AlertCircle
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-10 animate-fade-in max-w-4xl mx-auto pb-16 font-sans">
      
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-glow-cyan animate-float">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
            SignConnect <span className="gradient-text-cyan">AI</span>
          </h1>
          <p className="text-xl text-cyan-300 font-semibold tracking-wide">
            Every Sign. Every Voice.
          </p>
        </div>
        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-normal">
          An AI-powered assistive communication platform built to foster 
          accessible, dignified, and fluid conversations between deaf signers and hearing individuals.
        </p>
      </div>

      {/* Core Mission Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-7 rounded-3xl glass-card space-y-4 hover:border-cyan-400/50 hover:shadow-glow-cyan transition duration-300">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-glow-cyan">
            <Heart className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white font-display">Empowering ISL</h2>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            Over 18 million deaf individuals in India communicate using Indian Sign Language. SignConnect AI provides a digital bridge to ensure their expressions are accurately recognized.
          </p>
        </div>

        <div className="p-7 rounded-3xl glass-card space-y-4 hover:border-blue-400/50 hover:shadow-glow-blue transition duration-300">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-glow-blue">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white font-display">Two-Way Inclusion</h2>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            Communication must never be one-sided. Hearing individuals speak or type; deaf users sign. The platform translates gestures to voice and voice to readable live captions.
          </p>
        </div>

        <div className="p-7 rounded-3xl glass-card space-y-4 hover:border-purple-400/50 hover:shadow-glow-purple transition duration-300">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center text-purple-400 shadow-glow-purple">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white font-display">Local Privacy First</h2>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            Camera streams never leave your device. Landmark extraction runs in-browser, transmitting only coordinate vectors to the local backend.
          </p>
        </div>
      </div>

      {/* Privacy & Ethical Disclosures */}
      <div className="p-8 rounded-3xl glass-panel border border-emerald-500/25 space-y-5 shadow-2xl">
        <div className="flex items-center gap-3 text-white font-bold text-lg font-display">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <span>Privacy Architecture & Transparency</span>
        </div>

        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed font-normal">
          <p>
            • <strong className="text-white">No Video Uploads:</strong> Live camera frames are processed exclusively on the client machine using WebAssembly. Raw video is never stored or uploaded to external cloud servers.
          </p>
          <p>
            • <strong className="text-white">Landmark Coordinate Datasets:</strong> When training custom signs, only 21 normalized Cartesian coordinates (x, y, z) per hand and face anchors are saved to <code>backend/app/data/dataset.json</code> on your local machine.
          </p>
          <p>
            • <strong className="text-white">User Control:</strong> Users can inspect the exact sample count and wipe the entire dataset or specific signs with one click at any time.
          </p>
        </div>
      </div>

      {/* Medical / Legal Disclaimer */}
      <div className="p-6 rounded-3xl glass-card border border-amber-500/25 text-xs text-slate-300 space-y-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-amber-300 font-bold font-display">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>Prototype Notice</span>
        </div>
        <p className="leading-relaxed text-slate-400">
          SignConnect AI is an assistive communication proof-of-concept. It is not certified as medical, 
          legal, emergency, or certified assistive communication equipment. It supports a discrete set of trained ISL vocabulary 
          and should not be used in critical life-safety situations.
        </p>
      </div>

    </div>
  );
};
