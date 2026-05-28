'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Image from 'next/image';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FileDown,
  UploadCloud,
  Eraser,
  FileText
} from 'lucide-react';
import type { WebWorkerMLCEngine, InitProgressReport, ChatCompletionMessageParam } from '@mlc-ai/web-llm';

import { analyzeStatistics, TextStatistics } from '../lib/analysis/statistics';
import { analyzePatterns, PatternAnalysis } from '../lib/analysis/patterns';
import { calculateWritingScore, ScoringDetails } from '../lib/analysis/scoring';
import { generateSuggestions, Suggestion, detectHighlights, HighlightOccurrence } from '../lib/analysis/suggestions';

interface NavigatorWithGpu extends Navigator {
  gpu?: {
    requestAdapter?: () => Promise<unknown>;
  };
}

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
  const backdropRef = useRef<HTMLDivElement>(null);

  const [showHighlights, setShowHighlights] = useState(true);

  // WebLLM on-demand generative rewrite states
  const [aiState, setAiState] = useState<{
    status: 'idle' | 'loading' | 'generating' | 'error';
    progress: number;
    output: string;
    errorMsg?: string;
    activeSuggestionId?: string;
  }>({
    status: 'idle',
    progress: 0,
    output: '',
  });

  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [engineLoaded, setEngineLoaded] = useState(false);
  const [engineLoading, setEngineLoading] = useState(false);
  const [webGpuSupported, setWebGpuSupported] = useState<boolean>(true);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const gpu = (navigator as NavigatorWithGpu).gpu;
      setWebGpuSupported(!!gpu);
    }
  }, []);

  const workerRef = useRef<Worker | null>(null);
  const engineRef = useRef<WebWorkerMLCEngine | null>(null);

  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleToggleChange = async (checked: boolean) => {
    if (checked) {
      setIsAiEnabled(true);
      setEngineLoading(true);
      setAiState({
        status: 'loading',
        progress: 0,
        output: 'Initializing WebGPU...',
      });
      try {
        await initEngine();
        setEngineLoaded(true);
        setAiState(prev => ({
          ...prev,
          status: 'idle',
          output: '',
        }));
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("AI Engine initialization failed:", error);
        setIsAiEnabled(false);
        setEngineLoaded(false);
        setAiState(prev => ({
          ...prev,
          status: 'error',
          errorMsg: error.message || "Failed to initialize the local AI model.",
        }));
      } finally {
        setEngineLoading(false);
      }
    } else {
      setIsAiEnabled(false);
      setEngineLoaded(false);
      setEngineLoading(false);
      
      // Clean up engine & worker to free WebGPU memory
      if (engineRef.current) {
        try {
          await engineRef.current.unload();
        } catch (e) {
          console.warn("Error unloading engine:", e);
        }
        engineRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setAiState({
        status: 'idle',
        progress: 0,
        output: '',
      });
    }
  };

  const initEngine = async () => {
    if (engineRef.current) return engineRef.current;

    const gpu = (navigator as NavigatorWithGpu).gpu;
    if (!gpu) {
      throw new Error("WebGPU is not supported or enabled in this browser. Please use Chrome, Edge, or a WebGPU-enabled browser.");
    }

    setAiState(prev => ({ ...prev, status: 'loading', progress: 0, errorMsg: undefined }));

    // Check if shader-f16 is supported to determine if we should fall back to float32
    let hasShaderF16 = false;
    try {
      const adapter = await gpu.requestAdapter?.() as { features?: { has: (feature: string) => boolean } } | null;
      if (adapter?.features) {
        hasShaderF16 = adapter.features.has("shader-f16");
      }
    } catch (e) {
      console.warn("Failed to check WebGPU shader-f16 support, falling back to q4f32_1:", e);
    }

    const modelId = hasShaderF16
      ? "Qwen2.5-0.5B-Instruct-q4f16_1-MLC"
      : "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";

    const worker = new Worker(
      new URL('../workers/webllm.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');

    const engine = await CreateWebWorkerMLCEngine(
      worker,
      modelId,
      {
        initProgressCallback: (report: InitProgressReport) => {
          const match = report.text.match(/([0-9.]+)%/);
          let pct = 0;
          if (match) {
            pct = Math.round(parseFloat(match[1]));
          } else if (report.text.toLowerCase().includes("finish loading")) {
            pct = 100;
          }
          setAiState(prev => ({
            ...prev,
            progress: pct > 0 ? pct : prev.progress,
            output: report.text,
          }));
        }
      }
    );
    engineRef.current = engine;
    return engine;
  };

  const handleGenerateRewrite = async (suggestionId: string, occurrenceText: string, category: string) => {
    setAiState({
      status: 'loading',
      progress: 0,
      output: 'Initializing WebGPU and loading local AI model...',
      activeSuggestionId: suggestionId,
    });

    try {
      const engine = await initEngine();
      
      setAiState(prev => ({
        ...prev,
        status: 'generating',
        output: '',
      }));

      const systemPrompt = "You are an expert copywriter and editor. Your job is to rewrite the text provided by the user to improve its style, readability, and impact.";
      let userPrompt = "";

      if (category === 'sentence') {
        userPrompt = `Rewrite the following long sentence to be shorter, clearer, and more readable. If appropriate, split it into two sentences. Do NOT include any explanations, introduction, or conversational text. Return ONLY the rewritten text:\n\n"${occurrenceText}"`;
      } else if (category === 'style') {
        userPrompt = `Rewrite the following text to use active voice, making it direct, punchy, and engaging. Do NOT include any explanations, introduction, or conversational text. Return ONLY the rewritten text:\n\n"${occurrenceText}"`;
      } else {
        userPrompt = `Rewrite the following text to improve flow, remove repetition or bloated words, and enhance style. Do NOT include any explanations, introduction, or conversational text. Return ONLY the rewritten text:\n\n"${occurrenceText}"`;
      }

      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const chunks = await engine.chat.completions.create({
        messages,
        stream: true,
      });

      let fullText = "";
      for await (const chunk of chunks) {
        const delta = chunk.choices[0]?.delta.content || "";
        fullText += delta;
        setAiState(prev => ({
          ...prev,
          status: 'generating',
          output: fullText,
        }));
      }

      // If the model wrapped the output in quotes, strip them
      if (fullText.startsWith('"') && fullText.endsWith('"')) {
        fullText = fullText.slice(1, -1);
      }

      setAiState(prev => ({
        ...prev,
        status: 'idle',
        output: fullText,
      }));

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("AI Rewrite failed:", error);
      setAiState(prev => ({
        ...prev,
        status: 'error',
        errorMsg: error.message || "An error occurred during AI rewrite generation.",
      }));
    }
  };

  const handleApplyRewrite = (occurrenceText: string, rewrittenText: string) => {
    if (!text) return;

    let searchStr = occurrenceText.trim();
    searchStr = searchStr.replace(/^Phrase:\s*"/, '').replace(/"$/, '');
    searchStr = searchStr.replace(/^"/, '').replace(/"$/, '');

    const index = text.toLowerCase().indexOf(searchStr.toLowerCase());
    if (index !== -1) {
      const before = text.substring(0, index);
      const after = text.substring(index + searchStr.length);
      const newText = before + rewrittenText.trim() + after;
      setText(newText);
      runAnalysis(newText);

      setAiState({
        status: 'idle',
        progress: 0,
        output: '',
      });
    } else {
      alert("Could not find the original text in the editor to replace. It may have been edited.");
    }
  };

  const handleCancelRewrite = () => {
    setAiState({
      status: 'idle',
      progress: 0,
      output: '',
    });
  };

  // Helper to slice text into highlighted and plain segments
  interface HighlightSegment {
    text: string;
    isLongSentence: boolean;
    isPassive: boolean;
  }

  const getHighlightSegments = (textStr: string, highlightsList: HighlightOccurrence[]): HighlightSegment[] => {
    if (!textStr) return [];
    if (highlightsList.length === 0) {
      return [{ text: textStr, isLongSentence: false, isPassive: false }];
    }

    const boundariesSet = new Set<number>([0, textStr.length]);
    highlightsList.forEach(h => {
      boundariesSet.add(h.startIndex);
      boundariesSet.add(h.endIndex);
    });
    const boundaries = Array.from(boundariesSet).sort((a, b) => a - b);

    const segmentsList: HighlightSegment[] = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i];
      const end = boundaries[i + 1];
      const segmentText = textStr.substring(start, end);

      let isLongSentence = false;
      let isPassive = false;

      highlightsList.forEach(h => {
        if (start >= h.startIndex && end <= h.endIndex) {
          if (h.type === 'long-sentence') {
            isLongSentence = true;
          } else if (h.type === 'passive') {
            isPassive = true;
          }
        }
      });

      segmentsList.push({
        text: segmentText,
        isLongSentence,
        isPassive
      });
    }

    return segmentsList;
  };

  const renderHighlightedText = () => {
    if (!showHighlights || !text) {
      return <span className="text-slate-100">{text}</span>;
    }

    const highlights = detectHighlights(text);
    const segments = getHighlightSegments(text, highlights);

    const trailingNode = text.endsWith('\n') ? <span key="trailing" className="text-transparent"> </span> : null;

    const rendered = segments.map((seg, idx) => {
      let classes = "text-transparent";
      
      if (seg.isLongSentence && seg.isPassive) {
        classes += " bg-indigo-500/10 border-b-2 border-dashed border-rose-500/50";
      } else if (seg.isLongSentence) {
        classes += " bg-indigo-500/10 border-b border-dashed border-indigo-400/60";
      } else if (seg.isPassive) {
        classes += " bg-amber-500/15 border-b border-dashed border-amber-400/60";
      }

      return (
        <span key={idx} className={classes} style={{ textDecoration: 'none' }}>
          {seg.text}
        </span>
      );
    });

    return (
      <>
        {rendered}
        {trailingNode}
      </>
    );
  };

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

      // Smooth scroll to selection:
      // Count newlines before the selection start to approximate the line number
      const textBefore = text.substring(0, startIndex);
      const linesBefore = (textBefore.match(/\n/g) || []).length;
      
      // Fetch line-height styling of the textarea
      const style = window.getComputedStyle(textareaRef.current);
      const lineHeight = parseInt(style.lineHeight) || 20;
      
      // Center the highlighted line inside the textarea container
      const targetScrollTop = Math.max(
        0,
        (linesBefore * lineHeight) - (textareaRef.current.clientHeight / 2) + (lineHeight / 2)
      );

      textareaRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
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

  // Debounced auto-analysis for larger texts to maintain typing responsiveness
  useEffect(() => {
    if (text.length <= 40000 || text.length > 150000) {
      // Small/medium texts are updated synchronously in onChange.
      // Huge texts (> 150k) require clicking the manual "Analyze Writing" button.
      return;
    }

    const timer = setTimeout(() => {
      startTransition(() => {
        runAnalysis(text);
      });
    }, 1000);

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
    setAiState({
      status: 'idle',
      progress: 0,
      output: '',
    });
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
        return (
          <SuggestionsTab
            suggestions={suggestions}
            onHighlight={handleHighlight}
            aiState={aiState}
            onGenerateRewrite={handleGenerateRewrite}
            onApplyRewrite={handleApplyRewrite}
            onCancelRewrite={handleCancelRewrite}
            isAiEnabled={isAiEnabled}
            engineLoaded={engineLoaded}
            engineLoading={engineLoading}
            onToggleAi={handleToggleChange}
          />
        );
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
    <div className="grow flex flex-col min-h-screen relative overflow-hidden bg-[#070a13] text-slate-100">
      {/* Background Neon Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full opacity-10 blur-[120px] bg-linear-to-br from-blue-500 to-indigo-800 pointer-events-none animate-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full opacity-15 blur-[120px] bg-linear-to-br from-indigo-800 to-cyan-600 pointer-events-none animate-glow" />

      {/* Header Bar */}
      <header className="glass-panel border-b border-white/5 py-4 px-6 flex justify-between items-center z-25 sticky top-0">
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
            <h1 className="text-lg font-black tracking-wider bg-linear-to-r from-indigo-200 via-sky-200 to-cyan-300 bg-clip-text text-transparent flex items-center gap-1.5">
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
      <main className="grow grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 relative z-10 max-w-7xl mx-auto w-full">
        {/* Left Side: Editor (5 columns) */}
        <div className="lg:col-span-5 flex flex-col gap-4 h-full min-h-[500px]">
          {/* Label Bar */}
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" /> Writing Workspace
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHighlights(!showHighlights)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded border transition flex items-center gap-1 cursor-pointer select-none ${
                  showHighlights
                    ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20'
                    : 'text-slate-400 bg-slate-800/40 border-slate-700/25 hover:bg-slate-800/80'
                }`}
              >
                <Sparkles className="w-3 h-3 text-indigo-400" /> Highlights: {showHighlights ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={loadSample}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/10 hover:border-indigo-500/20 transition flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 animate-pulse" /> Load Sample
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
            className={`grow glass-panel rounded-2xl p-4 flex flex-col relative transition-all duration-300 ${
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

            {/* Top Toolbar: Pro Toggle and Model status */}
            <div className="flex flex-col gap-3 pb-3 mb-3 border-b border-slate-900/60 select-none">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-200 tracking-wide">Offline AI Rewrite</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider animate-pulse">Beta</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Runs Qwen 0.5B locally via WebGPU. 100% private.
                  </span>
                </div>
                
                {/* Toggle switch */}
                <div className="flex items-center gap-2">
                  {!webGpuSupported ? (
                    <span className="text-[9px] text-rose-400 font-semibold bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
                      WebGPU Not Supported
                    </span>
                  ) : (
                    <>
                      {engineLoaded && (
                        <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Ready
                        </span>
                      )}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAiEnabled}
                          onChange={(e) => handleToggleChange(e.target.checked)}
                          disabled={!webGpuSupported}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 peer-checked:after:bg-indigo-400 after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-950/40 border border-slate-700/50 peer-checked:border-indigo-500/50 shadow-inner"></div>
                      </label>
                    </>
                  )}
                </div>
              </div>
              
              {/* Progress bar (when active) */}
              {isAiEnabled && !engineLoaded && (
                <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 space-y-2 mt-1">
                  <div className="flex justify-between items-center text-[10px] text-indigo-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Securing local environment...
                    </span>
                    <span>{aiState.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-900/80 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-linear-to-r from-indigo-500 via-sky-400 to-cyan-400 h-full transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                      style={{ width: `${aiState.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                    <span className="truncate max-w-[80%]">{aiState.output || 'Waiting for WebGPU...'}</span>
                    <button
                      onClick={() => handleToggleChange(false)}
                      className="text-[9px] text-rose-400 hover:text-rose-300 font-bold lowercase hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Synced Backdrop and Opaque Textarea Container */}
            <div className="relative grow w-full min-h-0">
              {/* Highlights Backdrop */}
              <div
                ref={backdropRef}
                className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-y-auto whitespace-pre-wrap wrap-break-word text-transparent font-sans text-sm leading-relaxed pr-2 scrollbar-none"
                style={{
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  padding: '4px',
                  margin: 0,
                  border: 'none',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  boxSizing: 'border-box',
                }}
              >
                {renderHighlightedText()}
              </div>

              {/* Rich Editor Textarea */}
              <textarea
                ref={textareaRef}
                value={text}
                onScroll={handleScroll}
                onChange={(e) => {
                  const val = e.target.value;
                  setText(val);
                  if (val.length <= 40000) {
                    runAnalysis(val);
                  }
                }}
                placeholder="Paste your writing here to analyze. Alternatively, drag and drop a .txt file, or click 'Load Sample' to test."
                className="absolute inset-0 w-full h-full bg-transparent resize-none outline-none border-0 text-slate-100 placeholder-slate-500 text-sm leading-relaxed pr-2 overflow-y-auto"
                style={{
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  padding: '4px',
                  margin: 0,
                  boxSizing: 'border-box',
                }}
                maxLength={250000}
              />
            </div>

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
              className={`grow px-3 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('patterns')}
              className={`grow px-3 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'patterns'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Patterns
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`grow px-3 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center justify-center gap-1.5 ${
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
              className={`grow px-3 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                activeTab === 'visuals'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Visualizations
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`grow px-3 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileDown className="w-3.5 h-3.5" /> Export
            </button>
          </div>

          {/* Active Tab Panel glass wrapper */}
          <div className="grow glass-panel rounded-2xl p-6 overflow-y-auto max-h-[calc(100vh-210px)] min-h-[420px]">
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
