import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { LiveMeetingPage } from './pages/LiveMeetingPage';
import { TrainModelPage } from './pages/TrainModelPage';
import { SpeechTextPage } from './pages/SpeechTextPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { AboutPage } from './pages/AboutPage';
import { SettingsPage } from './pages/SettingsPage';
import { ISLDictionaryPage } from './pages/ISLDictionaryPage';
import { useSettings } from './hooks/useSettings';
import { apiService } from './services/api';
import { ModelStatus } from './types';
import { Sparkles, Heart } from 'lucide-react';

export function App() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const [initialRoomId, setInitialRoomId] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('room') || '';
    } catch (e) {
      return '';
    }
  });
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room')) return 'live-meeting';
    } catch (e) {}
    return 'dashboard';
  });
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [trainLabel, setTrainLabel] = useState<string>('');

  const handleSelectWordToTrain = (word: string) => {
    setTrainLabel(word);
    setCurrentTab('train-model');
  };

  // Poll / check backend status and model status
  const checkStatus = useCallback(async () => {
    try {
      await apiService.getHealth();
      setBackendOnline(true);
      const status = await apiService.getModelStatus();
      setModelStatus(status);
    } catch (e) {
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return (
    <div className={`min-h-screen flex flex-col bg-[#030712] text-slate-100 relative overflow-hidden ${settings.reducedAnimation ? '' : 'transition-colors'}`}>
      
      {/* Linear Spotlight & Radiant Glow Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 linear-spotlight">
        {/* Subtle grid lines with radial fade mask */}
        <div className="absolute inset-0 bg-linear-grid"></div>

        {/* Ambient Aurora Glow Spheres */}
        <div className="absolute -top-32 left-1/4 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent blur-[140px] pointer-events-none"></div>
        <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-cyan-500/15 via-blue-500/10 to-transparent blur-[150px] pointer-events-none"></div>
        <div className="absolute -bottom-40 left-1/3 w-[650px] h-[650px] rounded-full bg-gradient-to-t from-teal-500/10 via-cyan-500/8 to-transparent blur-[160px] pointer-events-none"></div>
      </div>

      {/* Floating Island Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        backendOnline={backendOnline}
        modelStatus={modelStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 relative z-10">
        {currentTab === 'dashboard' && (
          <DashboardPage
            onNavigate={setCurrentTab}
            modelStatus={modelStatus}
            backendOnline={backendOnline}
            onRefreshStatus={checkStatus}
          />
        )}

        {currentTab === 'live-meeting' && (
          <LiveMeetingPage
            settings={settings}
            modelStatus={modelStatus}
            backendOnline={backendOnline}
            onNavigateToTrain={() => setCurrentTab('train-model')}
            initialRoomId={initialRoomId}
          />
        )}

        {currentTab === 'isl-dictionary' && (
          <ISLDictionaryPage
            onSelectWordToTrain={handleSelectWordToTrain}
            backendOnline={backendOnline}
          />
        )}

        {currentTab === 'train-model' && (
          <TrainModelPage
            settings={settings}
            modelStatus={modelStatus}
            backendOnline={backendOnline}
            onRefreshStatus={checkStatus}
            onNavigateToLive={() => setCurrentTab('live-meeting')}
            initialSignLabel={trainLabel}
          />
        )}

        {currentTab === 'speech-text' && (
          <SpeechTextPage />
        )}

        {currentTab === 'how-it-works' && (
          <HowItWorksPage />
        )}

        {currentTab === 'about' && (
          <AboutPage />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            settings={settings}
            updateSetting={updateSetting}
            resetSettings={resetSettings}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 text-xs text-slate-400 bg-black/40 backdrop-blur-xl relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide font-display">SignConnect AI</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">Every Sign. Every Voice.</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Built with care for 24h Hackathon</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
            <span>Accessible Deaf Inclusion</span>
          </div>

          <div className="text-[11px] font-mono text-cyan-400/80 bg-white/[0.04] px-3 py-1 rounded-full border border-white/10">
            FastAPI + MediaPipe 3D + Scikit-Learn
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
