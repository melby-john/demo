import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  Volume2, 
  Dumbbell, 
  ExternalLink, 
  Database, 
  Layers, 
  ChevronRight, 
  Quote, 
  Award,
  RefreshCw,
  Info,
  Grid,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Maximize2
} from 'lucide-react';
import { apiService } from '../services/api';
import { ISignWord, ISignStats } from '../types';
import { useSpeech } from '../hooks/useSpeech';
import { DAILY_SIGNS, DailySignItem } from '../data/dailySigns';

interface ISLDictionaryPageProps {
  onSelectWordToTrain: (word: string) => void;
  backendOnline: boolean;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const DAILY_CATEGORIES = [
  'ALL',
  'Daily Needs & Food',
  'Responses & Agreement',
  'Actions & Movement',
  'Politeness & Social',
  'Family & People',
  'Inquiry & Expression'
] as const;

export const ISLDictionaryPage: React.FC<ISLDictionaryPageProps> = ({
  onSelectWordToTrain,
  backendOnline
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'isign'>('daily');
  const [words, setWords] = useState<ISignWord[]>([]);
  const [stats, setStats] = useState<ISignStats | null>(null);
  
  // Daily Signs filtering
  const [dailyCategory, setDailyCategory] = useState<string>('ALL');
  const [dailySearch, setDailySearch] = useState<string>('');
  const [selectedPosterModal, setSelectedPosterModal] = useState<boolean>(false);
  const [activePreviewCard, setActivePreviewCard] = useState<DailySignItem | null>(null);

  // iSign Lexicon filtering
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);

  const { speak } = useSpeech();

  // Load words and stats from backend
  const loadData = useCallback(async () => {
    if (!backendOnline) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, wordsRes] = await Promise.all([
        apiService.getISignStats().catch(() => null),
        apiService.getISignWords('', 650, 0)
      ]);
      if (statsRes) setStats(statsRes);
      if (wordsRes && wordsRes.words) {
        setWords(wordsRes.words);
      }
    } catch (err: any) {
      console.error('Failed to load iSign dictionary:', err);
      setError(err.message || 'Failed to connect to iSign dataset service.');
    } finally {
      setIsLoading(false);
    }
  }, [backendOnline]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter daily signs
  const filteredDailySigns = useMemo(() => {
    return DAILY_SIGNS.filter((item) => {
      const matchesCategory = dailyCategory === 'ALL' || item.category === dailyCategory;
      const matchesSearch =
        !dailySearch.trim() ||
        item.title.toLowerCase().includes(dailySearch.toLowerCase()) ||
        item.meaning.toLowerCase().includes(dailySearch.toLowerCase()) ||
        item.handshape.toLowerCase().includes(dailySearch.toLowerCase()) ||
        item.movement.toLowerCase().includes(dailySearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [dailyCategory, dailySearch]);

  // Filter iSign words
  const filteredWords = useMemo(() => {
    return words.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.examples.some((ex) => ex.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLetter =
        selectedLetter === 'ALL' ||
        item.word.toUpperCase().startsWith(selectedLetter);

      return matchesSearch && matchesLetter;
    });
  }, [words, searchQuery, selectedLetter]);

  return (
    <div className="space-y-8 animate-fade-in pb-16 font-sans">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl glass-card border border-indigo-500/25 p-8 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-navy-950/60 pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wide uppercase backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Interactive Sign Lexicon & Visual Guide</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
            Sign Language <span className="gradient-text-cyan">Lexicon & Dictionary</span>
          </h1>

          <p className="text-slate-300 text-base leading-relaxed font-normal">
            Master essential daily signs with rich illustrated visual flashcards, movement breakdown, 
            and real-time AI recognition. Plus explore the extensive <strong className="text-white font-semibold">iSign</strong> research benchmark lexicon.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setSelectedPosterModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-glow-indigo active:scale-95"
            >
              <ImageIcon className="w-4 h-4 text-cyan-200" />
              <span>View Full Visual Signs Chart</span>
              <Maximize2 className="w-3.5 h-3.5 opacity-75 ml-0.5" />
            </button>

            <span className="text-xs text-slate-300 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>All 24 daily signs supported in AI model</span>
            </span>
          </div>
        </div>
      </div>

      {/* Dataset Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:border-cyan-500/40 transition">
          <span className="text-xs text-slate-400 font-medium">Illustrated Daily Signs</span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-white font-display">24</span>
            <span className="text-xs text-cyan-400 font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">Flashcards</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/40 transition">
          <span className="text-xs text-slate-400 font-medium">Total Vocabulary Words</span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-white font-display">{stats?.total_words || words.length || 609}</span>
            <span className="text-xs text-emerald-400 font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">Verified</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/40 transition">
          <span className="text-xs text-slate-400 font-medium">Active AI Classifier</span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-white font-display">27</span>
            <span className="text-xs text-indigo-400 font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">Trained Signs</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:border-teal-500/40 transition">
          <span className="text-xs text-slate-400 font-medium">Tracking Joints & Anchors</span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-white font-display">21 Pts</span>
            <span className="text-xs text-teal-400 font-semibold px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20">MediaPipe 3D</span>
          </div>
        </div>
      </div>

      {/* Top View Toggle Tabs */}
      <div className="flex p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl w-fit">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'daily'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/40 shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <Grid className="w-4 h-4 text-cyan-400" />
          <span>Essential Daily Signs</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
            24 Cards
          </span>
        </button>

        <button
          onClick={() => setActiveTab('isign')}
          className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'isign'
              ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-400/40 shadow-glow-indigo'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span>iSign Research Lexicon</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-mono">
            {words.length || 585} Words
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: ESSENTIAL DAILY SIGNS (24 ILLUSTRATED FLASHCARDS) */}
      {/* ============================================================== */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          
          {/* Controls Bar */}
          <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={dailySearch}
                onChange={(e) => setDailySearch(e.target.value)}
                placeholder="Search essential signs (e.g. 'toilet', 'eat', 'thank you', 'water', 'dad', 'mom')..."
                className="w-full pl-12 pr-12 py-3.5 glass-input rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:border-cyan-400 transition"
              />
              {dailySearch && (
                <button
                  onClick={() => setDailySearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/10"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.08]">
              {DAILY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDailyCategory(cat)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                    dailyCategory === cat
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow-cyan'
                      : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {cat === 'ALL' ? 'All (24 Signs)' : cat}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Showing <strong>{filteredDailySigns.length}</strong> of 24 daily essential signs</span>
              <button
                onClick={() => setSelectedPosterModal(true)}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Open Reference Poster</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredDailySigns.map((item) => (
              <div
                key={item.id}
                className="group glass-card rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-cyan-400/50 hover:shadow-glow-cyan hover:-translate-y-1"
              >
                {/* Visual Image Header */}
                <div 
                  onClick={() => setActivePreviewCard(item)}
                  className="relative h-48 bg-navy-950/80 p-3 flex items-center justify-center border-b border-white/[0.08] cursor-pointer overflow-hidden group-hover:bg-navy-950/95 transition"
                >
                  <img
                    src={item.image}
                    alt={`Sign for ${item.title}`}
                    className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105 drop-shadow-md"
                    loading="lazy"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-navy-950/90 text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
                    {item.category}
                  </span>
                  <div className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-navy-950/80 text-slate-300 border border-white/10 opacity-0 group-hover:opacity-100 transition shadow">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-extrabold text-white tracking-tight group-hover:text-cyan-300 transition-colors font-display">
                        {item.title}
                      </h3>
                      <button
                        onClick={() => speak(item.title)}
                        title="Listen to word"
                        className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Handshape & Movement */}
                    <div className="text-[11px] text-slate-300 space-y-1.5 bg-navy-950/60 p-3 rounded-xl border border-white/[0.06]">
                      <p>
                        <strong className="text-cyan-400 font-semibold">Handshape:</strong>{' '}
                        {item.handshape}
                      </p>
                      <p>
                        <strong className="text-indigo-300 font-semibold">Movement:</strong>{' '}
                        {item.movement}
                      </p>
                    </div>

                    {/* Meaning */}
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.meaning}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-white/[0.08] flex items-center gap-2">
                    <button
                      onClick={() => onSelectWordToTrain(item.slug)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition shadow-glow-cyan active:scale-95"
                    >
                      <Dumbbell className="w-3.5 h-3.5" />
                      <span>Practice Sign</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDailySigns.length === 0 && (
            <div className="text-center py-16 glass-card rounded-2xl p-8 border border-white/10">
              <Search className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white">No matching daily signs found</h3>
              <p className="text-xs text-slate-400 mt-1">Try another search term or select "All (24 Signs)".</p>
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: iSIGN RESEARCH BENCHMARK LEXICON (585 WORDS) */}
      {/* ============================================================== */}
      {activeTab === 'isign' && (
        <div className="space-y-6">
          
          {/* Search and Alphabet Filter Bar */}
          <div className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ISL word, meaning, or sentence example (e.g. 'hospital', 'ashamed', 'water', 'help')..."
                className="w-full pl-12 pr-12 py-3.5 glass-input rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:border-indigo-400 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/10"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Alphabet Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setSelectedLetter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  selectedLetter === 'ALL'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow-indigo'
                    : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 border border-white/[0.06]'
                }`}
              >
                All ({words.length})
              </button>
              {ALPHABET.map((letter) => {
                const count = words.filter((w) => w.word.toUpperCase().startsWith(letter)).length;
                if (count === 0) return null;
                return (
                  <button
                    key={letter}
                    onClick={() => setSelectedLetter(letter)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                      selectedLetter === letter
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow-indigo'
                        : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 border border-white/[0.06]'
                    }`}
                  >
                    {letter} <span className="opacity-60 text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Results Counter */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Showing <strong>{filteredWords.length}</strong> matching terms</span>
              <button
                onClick={loadData}
                disabled={isLoading}
                className="flex items-center gap-1.5 hover:text-cyan-300 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Reload Lexicon</span>
              </button>
            </div>
          </div>

          {/* Loading & Error States */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-cyan-400 rounded-full animate-spin shadow-glow-cyan" />
              <p className="text-sm text-slate-300 font-medium">Loading vocabulary words from dataset...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-sm backdrop-blur-md">
              <Info className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <p>{error}</p>
            </div>
          )}

          {/* Word Cards Grid */}
          {!isLoading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredWords.map((item) => {
                const isExpanded = expandedWord === item.word;

                return (
                  <div
                    key={item.word}
                    className="group glass-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:border-indigo-400/40 hover:shadow-glow-indigo hover:-translate-y-0.5"
                  >
                    <div className="space-y-3.5">
                      {/* Card Header: Word Name and Audio Button */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-extrabold text-white capitalize group-hover:text-cyan-300 transition-colors font-display">
                            {item.word}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                            UID: {item.word_id || 'isign_v1.1'}
                          </span>
                        </div>

                        <button
                          onClick={() => speak(item.word)}
                          title="Speak word aloud"
                          className="p-2 rounded-xl bg-white/[0.05] hover:bg-indigo-600/30 text-slate-300 hover:text-white border border-white/10 transition"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Semantic Meaning / Description */}
                      <div className="text-xs text-slate-300 leading-relaxed bg-navy-950/60 p-3 rounded-xl border border-white/[0.06]">
                        <span className="text-cyan-400 font-semibold block mb-1">Meaning (Sign Gloss):</span>
                        <p className="line-clamp-3">{item.description}</p>
                      </div>

                      {/* Contextual Examples */}
                      {item.examples.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                            <Quote className="w-3 h-3 text-cyan-400" />
                            <span>Example Sentences ({item.examples.length}):</span>
                          </span>
                          <div className="text-xs text-slate-300 italic bg-white/[0.02] border border-white/[0.06] p-3 rounded-xl space-y-1.5">
                            <p>"{item.examples[0]}"</p>
                            {isExpanded && item.examples.slice(1).map((ex, i) => (
                              <p key={i} className="pt-1.5 border-t border-white/[0.06]">"{ex}"</p>
                            ))}
                          </div>

                          {item.examples.length > 1 && (
                            <button
                              onClick={() => setExpandedWord(isExpanded ? null : item.word)}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium pt-0.5"
                            >
                              {isExpanded ? 'Show less' : `+${item.examples.length - 1} more example(s)`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Action: Train This Sign Button */}
                    <div className="pt-4 mt-4 border-t border-white/[0.08]">
                      <button
                        onClick={() => onSelectWordToTrain(item.word.replace(/\s+/g, '_').toLowerCase())}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-500/10 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-cyan-600 text-indigo-300 hover:text-white border border-indigo-400/20 hover:border-transparent rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        <Dumbbell className="w-3.5 h-3.5" />
                        <span>Practice & Train Sign</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No results notice */}
          {!isLoading && !error && filteredWords.length === 0 && (
            <div className="text-center py-16 glass-card rounded-2xl border border-white/10 p-8">
              <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white">No matching ISL terms found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Try adjusting your search query or selecting a different letter filter above.
              </p>
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: FULL POSTER LIGHTBOX */}
      {/* ============================================================== */}
      {selectedPosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-fade-in">
          <div className="relative max-w-4xl w-full glass-panel border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 px-6 border-b border-white/[0.08] bg-navy-950/80">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Daily Sign Language Reference Poster (24 Signs)</span>
              </div>
              <button
                onClick={() => setSelectedPosterModal(false)}
                className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-auto flex items-center justify-center bg-navy-950/90">
              <img
                src="/signs/daily_signs_chart.jpg"
                alt="24 Daily Sign Languages Chart"
                className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            </div>

            <div className="p-4 px-6 border-t border-white/[0.08] bg-navy-950/80 flex items-center justify-between text-xs text-slate-400">
              <span>All 24 gestures can be detected or trained with your webcam.</span>
              <button
                onClick={() => setSelectedPosterModal(false)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-white font-bold transition shadow-glow-cyan"
              >
                Close Poster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CARD DETAIL PREVIEW LIGHTBOX */}
      {/* ============================================================== */}
      {activePreviewCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-fade-in">
          <div className="relative max-w-lg w-full glass-panel border border-white/15 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  {activePreviewCard.category}
                </span>
                <h3 className="text-2xl font-black text-white font-display">{activePreviewCard.title}</h3>
              </div>
              <button
                onClick={() => setActivePreviewCard(null)}
                className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-navy-950/80 p-4 rounded-2xl flex items-center justify-center border border-white/[0.08]">
              <img
                src={activePreviewCard.image}
                alt={activePreviewCard.title}
                className="max-h-56 object-contain rounded-xl drop-shadow-lg"
              />
            </div>

            <div className="space-y-2 text-xs text-slate-300 bg-navy-950/60 p-4 rounded-2xl border border-white/[0.06]">
              <p><strong className="text-cyan-400">Handshape:</strong> {activePreviewCard.handshape}</p>
              <p><strong className="text-indigo-300">Movement:</strong> {activePreviewCard.movement}</p>
              <p><strong className="text-slate-200">Meaning:</strong> {activePreviewCard.meaning}</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-400">Example Sentences:</span>
              <ul className="list-disc list-inside text-slate-300 text-xs space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
                {activePreviewCard.examples.map((ex, idx) => (
                  <li key={idx} className="italic">"{ex}"</li>
                ))}
              </ul>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => {
                  const slug = activePreviewCard.slug;
                  setActivePreviewCard(null);
                  onSelectWordToTrain(slug);
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-glow-cyan active:scale-95 transition"
              >
                <Dumbbell className="w-4 h-4" />
                <span>Practice & Record This Sign</span>
              </button>

              <button
                onClick={() => speak(activePreviewCard.title)}
                className="px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold border border-white/10 transition"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
