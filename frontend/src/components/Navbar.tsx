import React, { useState } from 'react';
import { 
  Sparkles, 
  Video, 
  GraduationCap, 
  Volume2, 
  HelpCircle, 
  Info, 
  Settings, 
  LayoutDashboard,
  Menu,
  X,
  Activity,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { ModelStatus } from '../types';

export type NavTab = 'dashboard' | 'live-meeting' | 'train-model' | 'isl-dictionary' | 'speech-text' | 'how-it-works' | 'about' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  backendOnline: boolean;
  modelStatus: ModelStatus | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  backendOnline,
  modelStatus
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-meeting' as NavTab, label: 'Live Meeting', icon: Video, highlight: true },
    { id: 'isl-dictionary' as NavTab, label: 'Dictionary', icon: BookOpen, badge: '585' },
    { id: 'train-model' as NavTab, label: 'Train Studio', icon: GraduationCap },
    { id: 'speech-text' as NavTab, label: 'Voice & Text', icon: Volume2 },
    { id: 'how-it-works' as NavTab, label: 'Architecture', icon: HelpCircle },
    { id: 'about' as NavTab, label: 'About', icon: Info },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-3 z-50 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto floating-island rounded-full px-4 sm:px-6 py-2.5 transition-all duration-300">
        <div className="flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-transform duration-300 group-hover:scale-105">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-base tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                SignConnect <span className="gradient-text-cyan">AI</span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/[0.06] text-cyan-300 border border-white/10 hidden sm:inline">
                ISL
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-1.5 py-0.2 rounded-full font-mono font-bold">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action & Status Area */}
          <div className="flex items-center gap-2.5">
            {/* Status Indicator */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-md transition-all ${
              backendOnline 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              <span>{backendOnline ? 'AI 8000' : 'Offline'}</span>
            </div>

            {/* Quick Meeting CTA Button */}
            <button
              onClick={() => handleNavClick('live-meeting')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full linear-btn-primary text-white text-xs font-bold active:scale-95 transition"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Launch Room</span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-full text-slate-400 hover:text-white bg-white/[0.05] border border-white/10 lg:hidden transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-3 max-w-6xl mx-auto floating-island rounded-3xl p-4 animate-fade-in shadow-2xl">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 p-3 rounded-2xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-400/40 shadow-glow-cyan'
                      : 'text-slate-300 hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
