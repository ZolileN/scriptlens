'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Image from 'next/image';
import {
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FileDown,
  UploadCloud,
  Eraser,
  HelpCircle,
  FileText
} from 'lucide-react';

import { analyzeStatistics, TextStatistics } from '../lib/analysis/statistics';
import { analyzePatterns, PatternAnalysis } from '../lib/analysis/patterns';
import { calculateWritingScore, ScoringDetails } from '../lib/analysis/scoring';
import { generateSuggestions, Suggestion } from '../lib/analysis/suggestions';

// Components
import OverviewTab from '../components/OverviewTab';
import PatternsTab from '../components/PatternsTab';
import SuggestionsTab from '../components/SuggestionsTab';
import VisualsTab from '../components/VisualsTab';
import ExportTab from '../components/ExportTab';

const SAMPLE_TEXT = `The analysis was completed by the team. They were informed of the findings. The results were found to be very consistent. 

It is important to remember that writing is a craft. Writing is a way to share thoughts. Writing is a form of communication. When you write, you should aim for clarity. When you write, you should think about your reader. When you write, you should seek to engage and inspire.

However, many writers suffer from monotone sentence structures. They write short sentences. They use similar patterns. They lack variation. They repeat words. This creates a highly uniform rhythm. The reader gets bored. The reader stops reading. The flow is completely lost.

Specifically, we want to achieve lexical diversity. Vocabulary diversity represents the range of unique words that are chosen in a piece of text. If you repeat the same word over and over again, the quality of your writing will suffer. In addition, using connective transition words is crucial because transition words establish relationships between ideas. Consequently, you will find that incorporating varied structures, complex vocabulary, and active verbs will elevate your writing style to new heights.`;

export default function Home() {
  const [text, setText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'suggestions' | 'visuals' | 'export'>('overview');
  const [dragActive, setDragActive] = useState(false);
  const [analysisTimeMs, setAnalysisTimeMs] = useState<number | null>(null);

  // Cached analysis state
  const [stats, setStats] = useState<TextStatistics | null>(null);
  const [patterns, setPatterns] = useState<PatternAnalysis | null>(null);
  const [scoring, setScoring] = useState<ScoringDetails | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleHighlight = (textToHighlight: string) => {
    if (!textareaRef.current || !text) return;

    // Clean the search string from UI labels or trailing ellipses
    let searchStr = textToHighlight.replace(/\.\.\.$/, '').trim();
    searchStr = searchStr.replace(/^Phrase:\s*"/, '').replace(/"\s*\(used \d+ times\)$/, '');
    searchStr = searchStr.replace(/^"/, '').replace(/"\s*\(used \d+ times\)$/, '');

    const startIndex = text.toLowerCase().indexOf(searchStr.toLowerCase());
    if (startIndex !== -1) {
      const endIndex = startIndex + searchStr.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(startIndex, endIndex);
    }
  };

  // Analyze function
  const runAnalysis = (rawText: string) => {
    const start = performance.now();
    
    // Compute metrics
    const computedStats = analyzeStatistics(rawText);
    const computedPatterns = analyzePatterns(rawText);
    const computedScoring = calculateWritingScore(rawText, computedStats, computedPatterns);
    const computedSuggestions = generateSuggestions(rawText, computedStats, computedPatterns);

    setStats(computedStats);
    setPatterns(computedPatterns);
    setScoring(computedScoring);
    setSuggestions(computedSuggestions);

    const end = performance.now();
    setAnalysisTimeMs(Math.round(end - start));
  };

  // Debounced auto-analysis on typing (disabled for huge files to maintain performance)
  useEffect(() => {
    if (text.length > 35000) {
      // Large file: require manual analysis to prevent UI stuttering
      return;
    }

    const timer = setTimeout(() => {
      startTransition(() => {
        runAnalysis(text);
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [text]);

  // Load sample text
  const loadSample = () => {
    setText(SAMPLE_TEXT);
    runAnalysis(SAMPLE_TEXT);
  };

  // Clear text
  const clearText = () => {
    setText('');
    setStats(null);
    setPatterns(null);
    setScoring(null);
    setSuggestions([]);
    setAnalysisTimeMs(null);
  };

  // File Upload Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      readUploadedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      readUploadedFile(e.target.files[0]);
    }
  };

  const readUploadedFile = (file: File) => {
    if (!file.name.endsWith('.txt')) {
      alert("Please upload a standard text file (.txt).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const fileContent = event.target.result as string;
        setText(fileContent);
        runAnalysis(fileContent);
      }
    };
    reader.readAsText(file);
  };

  const triggerManualAnalysis = () => {
    runAnalysis(text);
  };

  // Render sub-sections of the tabs
  const renderTabContent = () => {
    if (!stats || !patterns || !scoring) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-16 text-center text-slate-500">
          <FileText className="w-12 h-12 mb-3 opacity-40 text-slate-400" />
          <h4 className="font-semibold text-slate-400">Waiting for Text Input</h4>
          <p className="text-xs max-w-xs mt-1 leading-relaxed">
            Enter writing on the left or upload a file. ScripLens will immediately compute scores.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab stats={stats} scoring={scoring} />;
      case 'patterns':
        return <PatternsTab patterns={patterns} />;
      case 'suggestions':
        return <SuggestionsTab suggestions={suggestions} onHighlight={handleHighlight} />;
      case 'visuals':
        return <VisualsTab stats={stats} patterns={patterns} />;
      case 'export':
        return (
          <ExportTab
            stats={stats}
            patterns={patterns}
            scoring={scoring}
            suggestions={suggestions}
            rawText={text}
          />
        );
    }
  };

  return (
    <div className="flex-grow flex flex-col min-h-screen relative overflow-hidden bg-[#070a13] text-slate-100">
      {/* Background Neon Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full opacity-20 blur-[120px] bg-gradient-to-br from-indigo-500 to-purple-600 pointer-events-none animate-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full opacity-25 blur-[120px] bg-gradient-to-br from-indigo-600 to-cyan-500 pointer-events-none animate-glow" />

      {/* Header Bar */}
      <header className="glass-panel border-b border-white/5 py-4 px-6 flex justify-between items-center relative z-25 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20">
            <Image
              src="/logo.png"
              alt="ScripLens Logo"
              width={32}
              height={32}
              className="object-cover scale-110"
              priority
            />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-400 bg-clip-text text-transparent flex items-center gap-1.5">
              ScripLens <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-widest">v1 MVP</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shadow-inner">
            <ShieldCheck className="w-3.5 h-3.5" /> Privacy-First (Local)
          </div>
        </div>
      </header>

      {/* Dashboard Main Workspace Grid */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 relative z-10 max-w-7xl mx-auto w-full">
        {/* Left Side: Editor (5 columns) */}
        <div className="lg:col-span-5 flex flex-col gap-4 h-full min-h-[500px]">
          {/* Label Bar */}
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" /> Writing Workspace
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSample}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/10 hover:border-indigo-500/20 transition flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Load Sample
              </button>
              <button
                onClick={clearText}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700/20 transition flex items-center gap-1"
              >
                <Eraser className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>

          {/* Text Editor Box */}
          <div
            className={`flex-grow glass-panel rounded-2xl p-4 flex flex-col relative transition-all duration-300 ${
              dragActive ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5' : ''
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {/* Overlay File Drop Indicator */}
            {dragActive && (
              <div className="absolute inset-0 bg-[#070a13]/90 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-indigo-500 z-30 pointer-events-none">
                <UploadCloud className="w-12 h-12 text-indigo-400 animate-bounce mb-2" />
                <span className="font-bold text-slate-200 text-sm">Drop text file here</span>
                <span className="text-xs text-slate-500 mt-1">Accepts standard .txt documents</span>
              </div>
            )}

            {/* Rich Editor Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your writing here to analyze. Alternatively, drag and drop a .txt file, or click 'Load Sample' to test."
              className="flex-grow w-full bg-transparent resize-none outline-none border-0 text-slate-100 placeholder-slate-500 text-sm leading-relaxed pr-2"
              maxLength={250000}
            />

            {/* Live Count Pill Badges */}
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-900/60 text-[10px] font-bold text-slate-400 select-none">
              <span className="bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                Words: <span className="text-indigo-400 font-extrabold">{text.match(/[a-zA-Z0-9']+/g)?.length || 0}</span>
              </span>
              <span className="bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                Chars: <span className="text-violet-400 font-extrabold">{text.length}</span>
              </span>
              <span className="bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                Sentences: <span className="text-fuchsia-400 font-extrabold">{stats?.sentenceCount || 0}</span>
              </span>
              <span className="bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                Paragraphs: <span className="text-teal-400 font-extrabold">{stats?.paragraphCount || 0}</span>
              </span>
            </div>
          </div>

          {/* Trigger button & Status */}
          <div className="flex justify-between items-center bg-slate-900/40 p-3 rounded-xl border border-slate-800/40">
            <div className="text-[10px] font-semibold text-slate-400">
              {text.length > 35000 ? (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  ⚠ Large text. Auto-update paused.
                </span>
              ) : isPending ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" /> Computing metrics...
                </span>
              ) : analysisTimeMs !== null ? (
                <span>Analyzed locally in <span className="text-emerald-400 font-bold">{analysisTimeMs}ms</span></span>
              ) : (
                <span>Ready to analyze writing</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700/60 hover:border-slate-600 transition flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" /> Upload File
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt"
                className="hidden"
              />

              <button
                onClick={triggerManualAnalysis}
                disabled={text.trim() === '' || isPending}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-800/40 text-white text-xs font-extrabold rounded-lg border border-indigo-500 hover:border-indigo-400 hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.5)] transition duration-200 disabled:shadow-none flex items-center gap-1.5"
              >
                Analyze Writing <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Diagnostics & Tabs (7 columns) */}
        <div className="lg:col-span-7 flex flex-col gap-4 min-h-[500px]">
          {/* Tab Navigation Menu */}
          <div className="flex overflow-x-auto bg-slate-900/80 p-1 rounded-xl border border-slate-850 sticky top-16 z-20">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-grow px-3 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('patterns')}
              className={`flex-grow px-3 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'patterns'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Patterns
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`flex-grow px-3 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'suggestions'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Suggestions
              {suggestions.length > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'suggestions' ? 'bg-white text-indigo-700' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {suggestions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('visuals')}
              className={`flex-grow px-3 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                activeTab === 'visuals'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Visualizations
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-grow px-3 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileDown className="w-3.5 h-3.5" /> Export
            </button>
          </div>

          {/* Active Tab Panel glass wrapper */}
          <div className="flex-grow glass-panel rounded-2xl p-6 overflow-y-auto max-h-[calc(100vh-210px)] min-h-[420px]">
            {renderTabContent()}
          </div>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="py-4 px-6 text-center text-[10px] text-slate-500 border-t border-slate-900 mt-auto flex flex-col sm:flex-row justify-between items-center max-w-7xl mx-auto w-full gap-2 relative z-10">
        <span>© 2026 ScripLens. Runs 100% locally in your browser.</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Zero Telemetry</span>
          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Offline Capable</span>
        </div>
      </footer>
    </div>
  );
}
