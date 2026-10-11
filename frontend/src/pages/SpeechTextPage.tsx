import React, { useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Copy, 
  Trash2, 
  Sparkles, 
  CheckCheck, 
  AlertCircle,
  Play,
  Square,
  Sliders,
  Info,
  Radio
} from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';

export const SpeechTextPage: React.FC = () => {
  const {
    isTtsSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    speechPitch,
    setSpeechPitch,
    isSpeaking,
    speak,
    stopSpeaking,

    isSttSupported,
    isListening,
    transcript,
    finalTranscript,
    setTranscript,
    setFinalTranscript,
    sttError,
    startListening,
    stopListening,
    clearTranscript
  } = useSpeech();

  const [ttsInput, setTtsInput] = useState<string>(
    'Hello, I am communicating using SignConnect AI. Indian Sign Language empowers accessible communication.'
  );
  const [copiedTts, setCopiedTts] = useState<boolean>(false);
  const [copiedStt, setCopiedStt] = useState<boolean>(false);

  const quickPhrases = [
    'Hello, how are you today?',
    'Thank you for your patience.',
    'I am deaf and use Indian Sign Language to communicate.',
    'Could you please repeat that more slowly?',
    'Nice to meet you!'
  ];

  const dailySignWords = [
    'Yes', 'No', 'Toilet', 'Go', 'Eat', 'Drink',
    'Stop', 'All Done', 'Sit', 'Open', 'Less', 'More',
    'Thank You', 'Water', 'Mom', 'Dad', 'Please', 'Sorry',
    'Help', 'Question', 'Show Me', "You're Welcome", 'I Love You', 'Clean'
  ];

  const handleCopy = (text: string, type: 'tts' | 'stt') => {
    navigator.clipboard.writeText(text);
    if (type === 'tts') {
      setCopiedTts(true);
      setTimeout(() => setCopiedTts(false), 2000);
    } else {
      setCopiedStt(true);
      setTimeout(() => setCopiedStt(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16 font-sans">
      
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-400/30 text-purple-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
          <Volume2 className="w-3.5 h-3.5 text-purple-400" />
          <span>Two-Way Voice & Accessibility Studio</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          Speech & Text <span className="gradient-text-cyan">Communication</span>
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
          Browser-native Text-to-Speech (TTS) voice synthesis and Speech-to-Text (STT) transcription. 
          Bridge natural communication between deaf signers and hearing participants seamlessly.
        </p>
      </div>

      {/* Honest Limitation Banner */}
      <div className="p-4 rounded-2xl glass-panel border border-cyan-500/20 text-xs text-slate-300 flex items-start gap-3 backdrop-blur-xl">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-white font-semibold">Honest AI Note:</strong> Typed English is synthesized into audible speech using your system's Web Speech API. 
          Converting free-form spoken English into fully animated ISL grammar is a planned feature and not currently claimed.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Text-to-Speech (TTS) Card */}
        <div className="p-6 sm:p-7 rounded-3xl glass-card border border-cyan-500/20 space-y-5 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-glow-cyan">
                  <Volume2 className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-white font-display">Text-to-Speech (TTS)</h2>
              </div>
              <span className="text-[10px] text-cyan-300 font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                {isTtsSupported ? 'SpeechSynthesis Ready' : 'TTS Unsupported'}
              </span>
            </div>

            {!isTtsSupported ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5 mt-4">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Browser SpeechSynthesis is not supported in this browser environment.</span>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                
                {/* Text Area */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Message to Speak Aloud
                  </label>
                  <textarea
                    rows={4}
                    value={ttsInput}
                    onChange={(e) => setTtsInput(e.target.value)}
                    placeholder="Type any message for the computer to read aloud..."
                    className="w-full p-4 rounded-2xl glass-input text-sm text-white placeholder-slate-500 focus:border-cyan-400 transition"
                  />
                </div>

                {/* Daily Essential Sign Language Words Chips */}
                <div className="space-y-2">
                  <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Essential Daily Signs (24 Vocab):</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {dailySignWords.map((word, i) => (
                      <button
                        key={i}
                        onClick={() => setTtsInput(word)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 border border-white/[0.06] hover:border-cyan-400/40 text-[11px] text-cyan-300 font-medium transition active:scale-95"
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Phrase Chips */}
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-400 font-medium">Quick Phrases:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickPhrases.map((phrase, i) => (
                      <button
                        key={i}
                        onClick={() => setTtsInput(phrase)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-slate-300 transition"
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                      System Voice ({voices.length} available)
                    </label>
                    <select
                      value={selectedVoice?.name || ''}
                      onChange={(e) => {
                        const v = voices.find(vox => vox.name === e.target.value);
                        if (v) setSelectedVoice(v);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-xs text-white focus:border-cyan-400 transition"
                    >
                      {voices.map((v, i) => (
                        <option key={i} value={v.name} className="bg-navy-950 text-white">
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                      <span>Speech Rate: <strong className="text-cyan-300 font-mono">{speechRate}x</strong></span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer mt-2"
                    />
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isTtsSupported && (
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/[0.08]">
              {!isSpeaking ? (
                <button
                  onClick={() => speak(ttsInput)}
                  disabled={!ttsInput.trim()}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-glow-cyan transition active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Speak Message Aloud</span>
                </button>
              ) : (
                <button
                  onClick={stopSpeaking}
                  className="flex-1 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-rose-600/30 active:scale-95"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop Speaking</span>
                </button>
              )}

              <button
                onClick={() => handleCopy(ttsInput, 'tts')}
                className="px-4 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              >
                {copiedTts ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedTts ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() => setTtsInput('')}
                className="p-3.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 transition active:scale-95"
                title="Clear text"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Speech-to-Text (STT) Card */}
        <div className="p-6 sm:p-7 rounded-3xl glass-card border border-purple-500/20 space-y-5 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center text-purple-400 shadow-glow-purple">
                  <Mic className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-white font-display">Speech-to-Text (STT)</h2>
              </div>
              <span className="text-[10px] text-purple-300 font-mono px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                {isSttSupported ? 'SpeechRecognition Ready' : 'STT Unsupported'}
              </span>
            </div>

            {!isSttSupported ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2 mt-4">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Web Speech Recognition API Not Supported</span>
                </div>
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  Your current browser does not expose <code>window.SpeechRecognition</code>. Please use Google Chrome, Microsoft Edge, or Safari, or use standard text typing in the Live Meeting chat.
                </p>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                
                {/* Error if mic denied */}
                {sttError && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{sttError}</span>
                  </div>
                )}

                {/* Listening status indicator */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all backdrop-blur-xl ${
                  isListening 
                    ? 'bg-purple-950/70 border-purple-500 shadow-glow-purple'
                    : 'bg-white/[0.03] border-white/[0.08]'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-3.5 h-3.5 rounded-full ${isListening ? 'bg-purple-400 animate-ping' : 'bg-slate-600'}`}></span>
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">
                        {isListening ? 'Microphone Active — Listening...' : 'Microphone Inactive'}
                      </span>
                      {isListening && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce"></span>
                          <span className="w-1 h-4 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
                          <span className="w-1 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
                          <span className="w-1 h-5 bg-teal-400 rounded-full animate-bounce [animation-delay:450ms]"></span>
                          <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:200ms]"></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 active:scale-95 ${
                      isListening
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white shadow-glow-purple'
                    }`}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isListening ? 'Stop Listening' : 'Start Listening'}</span>
                  </button>
                </div>

                {/* Editable Transcript Area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Live Spoken Transcript (Editable)
                    </label>
                    {isListening && transcript && (
                      <span className="text-[10px] text-purple-400 font-mono animate-pulse">
                        Transcribing...
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={
                      finalTranscript
                        ? `${finalTranscript}${transcript && !finalTranscript.endsWith(transcript) ? ' ' + transcript : ''}`
                        : transcript
                    }
                    onChange={(e) => {
                      setFinalTranscript(e.target.value);
                      setTranscript('');
                    }}
                    placeholder="Spoken words will appear here in real time. You can also edit this text manually..."
                    className="w-full p-4 rounded-2xl glass-input text-sm text-white placeholder-slate-500 focus:border-purple-400 transition"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-300">Privacy Notice:</span>
                  <p>
                    Microphone audio is processed according to your browser's speech recognition engine (typically processed locally or via browser vendor APIs). Audio is never stored by SignConnect AI.
                  </p>
                </div>

              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isSttSupported && (
            <div className="flex items-center gap-3 pt-4 border-t border-white/[0.08]">
              {(() => {
                const currentFull = finalTranscript
                  ? `${finalTranscript}${transcript && !finalTranscript.endsWith(transcript) ? ' ' + transcript : ''}`
                  : transcript;
                return (
                  <>
                    <button
                      onClick={() => handleCopy(currentFull, 'stt')}
                      disabled={!currentFull.trim()}
                      className="flex-1 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-40 text-slate-200 border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95"
                    >
                      {copiedStt ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedStt ? 'Copied Transcript' : 'Copy Transcript'}</span>
                    </button>

                    <button
                      onClick={clearTranscript}
                      disabled={!currentFull.trim()}
                      className="px-5 py-3.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 disabled:opacity-40 text-slate-400 hover:text-rose-400 border border-white/10 text-xs font-semibold transition active:scale-95"
                    >
                      Clear
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
