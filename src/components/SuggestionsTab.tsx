import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileEdit,
  Lightbulb,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Suggestion } from '../lib/analysis/suggestions';

interface SuggestionsTabProps {
  suggestions: Suggestion[];
  onHighlight?: (text: string) => void;
  aiState?: {
    status: 'idle' | 'loading' | 'generating' | 'error';
    progress: number;
    output: string;
    errorMsg?: string;
    activeSuggestionId?: string;
  };
  onGenerateRewrite?: (suggestionId: string, occurrenceText: string, category: string) => void;
  onApplyRewrite?: (occurrenceText: string, rewrittenText: string) => void;
  onCancelRewrite?: () => void;
}

export default function SuggestionsTab({
  suggestions,
  onHighlight,
  aiState,
  onGenerateRewrite,
  onApplyRewrite,
  onCancelRewrite
}: SuggestionsTabProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getSeverityStyles = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />,
          border: 'border-rose-500/20 bg-rose-500/5 hover:border-rose-500/35',
          titleColor: 'text-rose-300',
          badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
          labelText: 'Critical Improvement',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />,
          border: 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/35',
          titleColor: 'text-amber-300',
          badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
          labelText: 'Warning Signal',
        };
      case 'info':
        return {
          icon: <Info className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />,
          border: 'border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/35',
          titleColor: 'text-cyan-300',
          badge: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
          labelText: 'Optimization',
        };
    }
  };

  const filteredSuggestions = suggestions.filter((s) => {
    if (filter === 'all') return true;
    return s.severity === filter;
  });

  const criticalCount = suggestions.filter((s) => s.severity === 'critical').length;
  const warningCount = suggestions.filter((s) => s.severity === 'warning').length;
  const infoCount = suggestions.filter((s) => s.severity === 'info').length;

  return (
    <div className="space-y-6">
      {/* Tab Filter Badges */}
      <div className="flex flex-wrap gap-2 pb-1 border-b border-slate-800">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            filter === 'all'
              ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 bg-transparent border border-transparent'
          }`}
        >
          All Issues <span className="bg-slate-800 text-[10px] text-slate-400 px-1.5 py-0.5 rounded-full">{suggestions.length}</span>
        </button>

        {criticalCount > 0 && (
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              filter === 'critical'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-transparent border border-transparent'
            }`}
          >
            Critical <span className="bg-rose-950 text-[10px] text-rose-400 px-1.5 py-0.5 rounded-full">{criticalCount}</span>
          </button>
        )}

        {warningCount > 0 && (
          <button
            onClick={() => setFilter('warning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              filter === 'warning'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-transparent border border-transparent'
            }`}
          >
            Warnings <span className="bg-amber-950 text-[10px] text-amber-400 px-1.5 py-0.5 rounded-full">{warningCount}</span>
          </button>
        )}

        {infoCount > 0 && (
          <button
            onClick={() => setFilter('info')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              filter === 'info'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-transparent border border-transparent'
            }`}
          >
            Optimizations <span className="bg-cyan-950 text-[10px] text-cyan-400 px-1.5 py-0.5 rounded-full">{infoCount}</span>
          </button>
        )}
      </div>

      {/* Suggestion Lists */}
      {filteredSuggestions.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center flex flex-col items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
          <h4 className="font-semibold text-slate-200">Writing looks great!</h4>
          <p className="text-xs text-slate-400 mt-1">No stylistic improvements found for the active filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSuggestions.map((sug) => {
            const styles = getSeverityStyles(sug.severity);
            const isExpanded = expandedIds.has(sug.id);

            return (
              <div
                key={sug.id}
                className={`glass-panel border rounded-xl overflow-hidden transition-all duration-200 ${styles.border}`}
              >
                {/* Header block (Click to expand) */}
                <button
                  onClick={() => toggleExpand(sug.id)}
                  className="w-full text-left p-4 flex items-start justify-between gap-3 focus:outline-none"
                >
                  <div className="flex gap-3">
                    {styles.icon}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold text-sm ${styles.titleColor}`}>{sug.title}</h4>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${styles.badge}`}>
                          {styles.labelText}
                        </span>
                      </div>
                      {!isExpanded && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{sug.explanation}</p>}
                    </div>
                  </div>
                  <div className="text-slate-400 mt-0.5 shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800 bg-slate-950/40 text-xs space-y-4">
                    {/* Detailed explanation */}
                    <div>
                      <h5 className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3 text-indigo-400" /> Explanation
                      </h5>
                      <p className="text-slate-300 leading-relaxed">{sug.explanation}</p>
                    </div>

                    {/* How to Fix */}
                    <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                      <h5 className="font-semibold text-indigo-300 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1">
                        <FileEdit className="w-3.5 h-3.5" /> Recommended Action
                      </h5>
                      <p className="text-slate-300 leading-relaxed font-medium">{sug.suggestedFix}</p>
                    </div>

                    {/* Triggering phrases / sentences */}
                    {sug.occurrences.length > 0 && (
                      <div>
                        <h5 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-1.5">
                          Detected Instances ({sug.occurrences.length})
                        </h5>
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                          {sug.occurrences.map((occ, idx) => {
                            const occurrenceId = `${sug.id}-${idx}`;
                            const isCurrentAi = aiState?.activeSuggestionId === occurrenceId;
                            
                            return (
                              <div key={idx} className="p-3 bg-slate-900/60 border border-slate-850 rounded flex flex-col gap-2">
                                <div
                                  onClick={() => onHighlight && onHighlight(occ)}
                                  className={`font-mono text-[10px] text-slate-350 whitespace-pre-wrap leading-normal ${onHighlight ? 'cursor-pointer hover:text-indigo-400 transition' : ''}`}
                                  title={onHighlight ? "Click to highlight in editor" : undefined}
                                >
                                  {occ}
                                </div>
                                
                                {/* AI Rewrite UI for this specific occurrence */}
                                {isCurrentAi && aiState ? (
                                  <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-2">
                                    {aiState.status === 'loading' && (
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[9px] text-slate-400">
                                          <span className="flex items-center gap-1">
                                            <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                                            Initializing Local AI Model...
                                          </span>
                                          <span className="font-bold">{aiState.progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                                          <div
                                            className="bg-indigo-500 h-full transition-all duration-300"
                                            style={{ width: `${aiState.progress}%` }}
                                          />
                                        </div>
                                        <div className="text-[8px] text-slate-500 font-mono truncate">
                                          {aiState.output}
                                        </div>
                                      </div>
                                    )}

                                    {aiState.status === 'generating' && (
                                      <div className="space-y-1.5">
                                        <div className="text-[9px] text-indigo-400 font-bold flex items-center gap-1">
                                          <RefreshCw className="w-3 h-3 animate-spin" /> AI is streaming rewrite...
                                        </div>
                                        <div className="p-2 bg-indigo-950/20 border border-indigo-500/20 rounded text-[10px] text-slate-200 italic whitespace-pre-wrap leading-relaxed font-sans">
                                          {aiState.output || "..."}
                                        </div>
                                      </div>
                                    )}

                                    {aiState.status === 'idle' && aiState.output && (
                                      <div className="space-y-2">
                                        <div className="text-[9px] text-emerald-400 font-bold">✓ AI Suggestion:</div>
                                        <div className="p-2 bg-emerald-950/25 border border-emerald-500/20 rounded text-[10px] text-slate-250 font-sans leading-relaxed">
                                          {aiState.output}
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                          <button
                                            onClick={onCancelRewrite}
                                            className="px-2.5 py-1 text-[9px] font-bold text-slate-400 hover:text-slate-200 bg-slate-850 hover:bg-slate-800 rounded border border-slate-750 transition"
                                          >
                                            Discard
                                          </button>
                                          <button
                                            onClick={() => onApplyRewrite && onApplyRewrite(occ, aiState.output)}
                                            className="px-2.5 py-1 text-[9px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded border border-emerald-500 transition"
                                          >
                                            Apply Rewrite
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {aiState.status === 'error' && (
                                      <div className="space-y-2">
                                        <div className="text-[9px] text-rose-400 font-bold">⚠ AI Rewrite Error:</div>
                                        <div className="text-[9px] text-rose-300 font-mono bg-rose-950/20 border border-rose-500/25 p-2 rounded leading-relaxed">
                                          {aiState.errorMsg || "WebGPU load failed. Make sure your browser supports WebGPU (e.g. Chrome/Edge)."}
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                          <button
                                            onClick={onCancelRewrite}
                                            className="px-2.5 py-1 text-[9px] font-bold text-slate-400 hover:text-slate-200 bg-slate-850 hover:bg-slate-800 rounded border border-slate-750 transition"
                                          >
                                            Dismiss
                                          </button>
                                          <button
                                            onClick={() => onGenerateRewrite && onGenerateRewrite(occurrenceId, occ, sug.category)}
                                            className="px-2.5 py-1 text-[9px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded border border-indigo-500 transition"
                                          >
                                            Retry
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center mt-1">
                                    <span className="text-[8px] text-slate-500">
                                      {onHighlight ? "Click text to view in editor" : ""}
                                    </span>
                                    <button
                                      disabled={aiState && aiState.status !== 'idle' && aiState.status !== 'error'}
                                      onClick={() => onGenerateRewrite && onGenerateRewrite(occurrenceId, occ, sug.category)}
                                      className="px-2.5 py-0.5 text-[9px] font-bold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-600/80 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-indigo-500/25 hover:border-indigo-400 transition flex items-center gap-1 select-none cursor-pointer"
                                    >
                                      <Sparkles className="w-2.5 h-2.5" /> AI Rewrite
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
