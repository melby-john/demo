import React, { useState } from 'react';
import { 
  Settings, 
  Moon, 
  Sun, 
  Type, 
  Sliders, 
  Volume2, 
  RotateCcw, 
  Trash2, 
  Check, 
  Server,
  Eye,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  updateSetting,
  resetSettings
}) => {
  const [clearedChat, setClearedChat] = useState<boolean>(false);
  const [clearedHistory, setClearedHistory] = useState<boolean>(false);

  const handleClearChat = () => {
    localStorage.removeItem('signconnect_chat');
    setClearedChat(true);
    setTimeout(() => setClearedChat(false), 2000);
  };

  const handleClearHistory = () => {
    localStorage.removeItem('signconnect_history');
    setClearedHistory(true);
    setTimeout(() => setClearedHistory(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-16 font-sans">
      
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
          <Settings className="w-3.5 h-3.5 text-cyan-400" />
          <span>Accessibility & Preferences</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          Settings & <span className="gradient-text-cyan">Accessibility</span>
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
          Customize high-contrast appearance, caption sizing, recognition sensitivity thresholds, 
          and audio preferences. Saved automatically to your local browser storage.
        </p>
      </div>

      <div className="space-y-6">
        
        {/* Visual Appearance & Theme */}
        <div className="p-7 rounded-3xl glass-panel space-y-5 shadow-2xl">
          <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>Display & Visual Appearance</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Theme Toggle */}
            <div className="p-5 rounded-2xl glass-card space-y-3">
              <span className="text-xs font-semibold text-slate-200 block">Theme Mode</span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => updateSetting('theme', 'dark')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    settings.theme === 'dark'
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/40 shadow-glow-cyan'
                      : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Dark Theme</span>
                </button>
                <button
                  onClick={() => updateSetting('theme', 'light')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    settings.theme === 'light'
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/40 shadow-glow-cyan'
                      : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light Mode</span>
                </button>
              </div>
            </div>

            {/* Caption Size */}
            <div className="p-5 rounded-2xl glass-card space-y-3">
              <span className="text-xs font-semibold text-slate-200 block">Live Caption Font Size</span>
              <div className="grid grid-cols-4 gap-2">
                {(['sm', 'md', 'lg', 'xl'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => updateSetting('captionSize', size)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                      settings.captionSize === size
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow-cyan'
                        : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            {/* Mirror Camera */}
            <label className="flex items-center justify-between p-5 rounded-2xl glass-card cursor-pointer hover:border-cyan-500/40 transition">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Mirror Camera Preview</span>
                <span className="text-[11px] text-slate-400">Flips video horizontally to match a mirror</span>
              </div>
              <input
                type="checkbox"
                checked={settings.mirrorCamera}
                onChange={(e) => updateSetting('mirrorCamera', e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer rounded"
              />
            </label>

            {/* Reduced Animation */}
            <label className="flex items-center justify-between p-5 rounded-2xl glass-card cursor-pointer hover:border-cyan-500/40 transition">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Reduced Motion</span>
                <span className="text-[11px] text-slate-400">Minimizes glowing pulses and UI animations</span>
              </div>
              <input
                type="checkbox"
                checked={settings.reducedAnimation}
                onChange={(e) => updateSetting('reducedAnimation', e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer rounded"
              />
            </label>
          </div>
        </div>

        {/* AI & Prediction Sensitivity */}
        <div className="p-7 rounded-3xl glass-panel space-y-5 shadow-2xl">
          <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>Sign Recognition Sensitivity</span>
          </h2>

          <div className="space-y-4">
            {/* Confidence Threshold */}
            <div className="p-5 rounded-2xl glass-card space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-200">
                  Minimum Confidence Threshold: <strong className="text-cyan-400 font-mono text-sm">{Math.round(settings.confidenceThreshold * 100)}%</strong>
                </span>
                <span className="text-[11px] text-slate-400">Recommended: 65% – 75%</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={settings.confidenceThreshold}
                onChange={(e) => updateSetting('confidenceThreshold', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Higher values reduce false recognitions but require more precise gestures.
              </p>
            </div>

            {/* Prediction Cooldown */}
            <div className="p-5 rounded-2xl glass-card space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-200">
                  Recognition Cooldown: <strong className="text-cyan-400 font-mono text-sm">{settings.cooldownMs}ms</strong>
                </span>
                <span className="text-[11px] text-slate-400">Prevents repeated triggers</span>
              </div>
              <input
                type="range"
                min="300"
                max="2000"
                step="100"
                value={settings.cooldownMs}
                onChange={(e) => updateSetting('cooldownMs', parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Time required between consecutive sign classifications.
              </p>
            </div>

            {/* Auto speak on recognized */}
            <label className="flex items-center justify-between p-5 rounded-2xl glass-card cursor-pointer hover:border-cyan-500/40 transition">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Auto-Speak Recognized Signs</span>
                <span className="text-[11px] text-slate-400">
                  Automatically utters recognized signs using Text-to-Speech when threshold is met
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSpeak}
                onChange={(e) => updateSetting('autoSpeak', e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer rounded"
              />
            </label>
          </div>
        </div>

        {/* Backend Endpoint & Data Storage */}
        <div className="p-7 rounded-3xl glass-panel space-y-5 shadow-2xl">
          <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <Server className="w-4 h-4" />
            <span>Backend & Local Storage</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                FastAPI Backend URL
              </label>
              <input
                type="text"
                value={settings.backendUrl}
                onChange={(e) => updateSetting('backendUrl', e.target.value)}
                placeholder="http://127.0.0.1:8000"
                className="w-full px-4 py-3 rounded-xl glass-input text-sm text-white focus:border-cyan-400 font-mono text-xs transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/[0.08]">
              <button
                onClick={handleClearChat}
                className="flex-1 py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95"
              >
                {clearedChat ? <Check className="w-4 h-4 text-emerald-400" /> : <Trash2 className="w-4 h-4" />}
                <span>{clearedChat ? 'Chat History Cleared' : 'Clear Chat History'}</span>
              </button>

              <button
                onClick={handleClearHistory}
                className="flex-1 py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95"
              >
                {clearedHistory ? <Check className="w-4 h-4 text-emerald-400" /> : <Trash2 className="w-4 h-4" />}
                <span>{clearedHistory ? 'Recent Signs Cleared' : 'Clear Recent Signs'}</span>
              </button>

              <button
                onClick={resetSettings}
                className="py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
