import { useState, useEffect } from 'react';
import { AppSettings } from '../types';

const STORAGE_KEY = 'signconnect_settings';

const defaultSettings: AppSettings = {
  theme: 'dark',
  captionSize: 'lg',
  confidenceThreshold: 0.70,
  cooldownMs: 800,
  autoSpeak: true,
  mirrorCamera: true,
  reducedAnimation: false,
  backendUrl: 'http://127.0.0.1:8000'
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultSettings, ...parsed, autoSpeak: parsed.autoSpeak ?? true };
      }
    } catch (e) {
      console.warn('Could not read settings from localStorage', e);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not write settings to localStorage', e);
    }

    // Apply dark/light class to root document element
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [settings]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return { settings, updateSetting, resetSettings };
}
