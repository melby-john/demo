export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export interface FaceKeypoints {
  forehead: LandmarkPoint;
  nose: LandmarkPoint;
  mouth: LandmarkPoint;
  chin: LandmarkPoint;
  leftCheek?: LandmarkPoint;
  rightCheek?: LandmarkPoint;
}

export type HandLandmarks = LandmarkPoint[];

export interface ModelStatus {
  ready: boolean;
  classes: string[];
  sample_count: number;
  accuracy: number | null;
  last_trained: string | null;
  message?: string;
  estimator_count?: number;
  feature_dimension?: number;
}

export interface DatasetSummary {
  total_samples: number;
  labels: Record<string, number>;
  label_count: number;
}

export interface PredictionResult {
  label: string;
  confidence: number;
  recognized: boolean;
  all_probabilities?: Record<string, number>;
}

export interface TrainingResult {
  status: string;
  message: string;
  accuracy: number;
  classes: string[];
  sample_count: number;
  test_accuracy?: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'signer' | 'hearing' | 'system';
  timestamp: string;
  isSignPrediction?: boolean;
  confidence?: number;
  isConfirmed?: boolean;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  captionSize: 'sm' | 'md' | 'lg' | 'xl';
  confidenceThreshold: number; // e.g. 0.70
  cooldownMs: number; // e.g. 800
  autoSpeak: boolean;
  mirrorCamera: boolean;
  reducedAnimation: boolean;
  backendUrl: string;
}

export interface ISignWord {
  word: string;
  word_id: string;
  description: string;
  examples: string[];
}

export interface ISignStats {
  source: string;
  benchmark_version: string;
  total_words: number;
  total_description_samples: number;
  total_presence_samples: number;
}

export interface ISignWordsResponse {
  total: number;
  limit: number;
  offset: number;
  words: ISignWord[];
}
