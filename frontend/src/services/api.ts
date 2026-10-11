import { ModelStatus, DatasetSummary, PredictionResult, TrainingResult, LandmarkPoint, FaceKeypoints, ISignStats, ISignWord, ISignWordsResponse } from '../types';

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';

function getBaseUrl(): string {
  try {
    const saved = localStorage.getItem('signconnect_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.backendUrl) return parsed.backendUrl;
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_BACKEND_URL;
}

export const apiService = {
  async getHealth(): Promise<{ status: string; app: string; tagline: string; version: string }> {
    const res = await fetch(`${getBaseUrl()}/api/health`);
    if (!res.ok) throw new Error(`Health check failed with HTTP ${res.status}`);
    return res.json();
  },

  async getModelStatus(): Promise<ModelStatus> {
    const res = await fetch(`${getBaseUrl()}/api/model/status`);
    if (!res.ok) throw new Error(`Failed to fetch model status (HTTP ${res.status})`);
    return res.json();
  },

  async getDatasetSummary(): Promise<DatasetSummary> {
    const res = await fetch(`${getBaseUrl()}/api/dataset/summary`);
    if (!res.ok) throw new Error(`Failed to fetch dataset summary (HTTP ${res.status})`);
    return res.json();
  },

  async addSamples(samples: Array<{
    label: string;
    landmarks?: LandmarkPoint[];
    hands?: LandmarkPoint[][];
    features?: number[];
    face?: FaceKeypoints | null;
    faceLandmarks?: LandmarkPoint[];
  }>): Promise<{ status: string; added_count: number; summary: DatasetSummary }> {
    const res = await fetch(`${getBaseUrl()}/api/dataset/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ samples })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to save dataset samples');
    }
    return res.json();
  },

  async deleteSamples(label?: string): Promise<{ status: string; deleted_count: number; summary: DatasetSummary }> {
    const url = label ? `${getBaseUrl()}/api/dataset/samples?label=${encodeURIComponent(label)}` : `${getBaseUrl()}/api/dataset/samples`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete dataset samples');
    return res.json();
  },

  async resetDefaultDataset(): Promise<{ status: string; message: string; training: TrainingResult }> {
    const res = await fetch(`${getBaseUrl()}/api/dataset/reset-default`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset default dataset');
    return res.json();
  },

  async trainModel(): Promise<TrainingResult> {
    const res = await fetch(`${getBaseUrl()}/api/model/train`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Training failed');
    }
    return res.json();
  },

  async predictSign(payload: {
    landmarks?: LandmarkPoint[];
    hands?: LandmarkPoint[][];
    features?: number[];
    face?: FaceKeypoints | null;
    faceLandmarks?: LandmarkPoint[];
  }): Promise<PredictionResult> {
    const res = await fetch(`${getBaseUrl()}/api/model/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Prediction failed');
    }
    return res.json();
  },

  async getISignStats(): Promise<ISignStats> {
    const res = await fetch(`${getBaseUrl()}/api/isign/stats`);
    if (!res.ok) throw new Error('Failed to fetch iSign dataset stats');
    return res.json();
  },

  async getISignWords(q?: string, limit: number = 50, offset: number = 0): Promise<ISignWordsResponse> {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    const res = await fetch(`${getBaseUrl()}/api/isign/words?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch iSign words');
    return res.json();
  },

  async getISignWord(word: string): Promise<ISignWord> {
    const res = await fetch(`${getBaseUrl()}/api/isign/words/${encodeURIComponent(word)}`);
    if (!res.ok) throw new Error(`Word '${word}' not found in iSign dataset`);
    return res.json();
  }
};
