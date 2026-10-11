# SignConnect AI

> **Tagline:** Every Sign. Every Voice.  
> **Mission:** An AI-powered accessibility platform designed to bridge deaf and hard-of-hearing communication with hearing participants using Indian Sign Language (ISL), computer vision, text, and speech. Built for a 24-hour hackathon.

---

## 🌟 Highlights & Real Functionality

- **Live Hand Tracking**: Real-time browser MediaPipe Tasks Vision hand landmarker extracting 21 3D coordinates per hand.
- **Scale & Translation Invariance**: Wrist-centered relative coordinate normalization into a standardized 126-dimensional feature vector.
- **Trained Machine Learning Model**: Real scikit-learn Random Forest classifier with 100 decision trees, serialized using `joblib`.
- **Honest Confidence Filtering**: Only displays confident predictions above user-configured thresholds (default 70%), with cooldown smoothing. If confidence is insufficient, displays *"Sign not recognized clearly. Please try again."*
- **Custom Model Training Studio**: Record real webcam hand gesture samples for any custom sign label, manage sample counts, and train models with live cross-validation metrics.
- **Two-Way Voice & Captions**:
  - **Text-to-Speech (TTS)**: Reads sign captions or typed messages aloud using browser `SpeechSynthesis` with voice and rate selection.
  - **Speech-to-Text (STT)**: Transcribes spoken English in real time using the Web Speech Recognition API with visual indicators.
- **Accessible Dark-Themed UI**: Built with React, Vite, TypeScript, and Tailwind CSS. Features high contrast, visible focus states, adjustable caption sizes, and persistent user preferences in `LocalStorage`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS |
| **Icons** | Lucide React |
| **Vision Tracking** | MediaPipe Tasks Vision (WebAssembly / GPU) |
| **ML & Backend** | Python 3.10+, FastAPI, Uvicorn, scikit-learn, joblib, Pydantic |
| **Speech APIs** | Web SpeechSynthesis API (TTS), Web SpeechRecognition API (STT) |
| **Persistence** | LocalStorage (UI settings & recent signs), JSON dataset (`backend/app/data/dataset.json`), joblib binaries (`backend/app/models/`) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.10+** (with `pip`)
- **Node.js 18+** & **npm**

### 2. Backend Setup & Run

Open a terminal in the `backend/` folder:

```powershell
# Navigate to backend
cd backend

# Install Python dependencies
python -m pip install -r requirements.txt

# Run the FastAPI server
python run_server.py
```
> The backend runs at `http://127.0.0.1:8000`. You can inspect interactive API documentation at `http://127.0.0.1:8000/docs`.

### 3. Frontend Setup & Run

Open a second terminal in the `frontend/` folder:

```powershell
# Navigate to frontend
cd frontend

# Install npm dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev -- --host 127.0.0.1 --port 5173
```
> Open your browser at `http://127.0.0.1:5173`.

---

## 📐 Application Architecture & Workflow

```
[Webcam Stream] 
       │
       ▼
[MediaPipe Vision in Browser] ──▶ Extracts 21 3D Landmarks per Hand
       │
       ▼
[Spatial Feature Extractor] ────▶ Wrist Centering + Scale Normalization (126D Vector)
       │
       ▼ (REST POST /api/model/predict)
[FastAPI Backend ML Service] ───▶ Scikit-Learn Random Forest Classifier (100 Trees)
       │
       ▼ (Prediction + Confidence Score)
[Confidence & Cooldown Filter] ─▶ Threshold Check (>= 70%) & Temporal Smoothing
       │
       ▼
[Live Meeting Workspace] ───────▶ Captions Display, Chat Transcript, Web Speech TTS
```

---

## 🧭 Page Overview

1. **Dashboard (`/`)**: Real-time status indicators (FastAPI connection, model status, permissions), quick launch buttons, and recent sign history.
2. **Live Meeting Workspace**: Zoom-style real-time 2-participant video calling interface. Features live WebRTC direct calling with STUN signaling, optional Jitsi Meet cloud room integration, 3D MediaPipe hand/face landmark HUD, synchronized sign-to-text captions, hearing speech-to-text live subtitles, two-way synchronized chat, and automatic voice synthesis (TTS).
3. **Train Custom Model**: ML data collection suite to enter sign labels, record real landmark frames, review sample distribution, seed baseline signs, and train Random Forest models.
4. **Speech & Text Lab**: Voice synthesis playground with voice picker, pitch and rate sliders, quick phrases, and microphone speech-to-text.
5. **How It Works**: Interactive architectural diagrams and 6-step breakdown distinguishing implemented features from future roadmap items.
6. **About**: Mission, Indian Sign Language context, privacy architecture, and ethical disclaimers.
7. **Settings**: Theme switcher (dark/light), caption font size, confidence threshold slider, cooldown duration, and local storage controls.

---

## 🔒 Privacy & Reliability Disclosures

- **100% In-Browser Video Processing**: Camera frames are processed locally via WebAssembly; raw video is never uploaded or saved.
- **Local Feature Storage**: Only anonymous coordinate features are saved to `backend/app/data/dataset.json` when recording custom signs.
- **Prototype Scope**: Designed for hackathon demonstration of discrete ISL sign classification. Not certified as medical or life-critical assistive technology.
