import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileEdit,
  Lightbulb
} from 'lucide-react';
import { Suggestion } from '../lib/analysis/suggestions';

interface SuggestionsTabProps {
  suggestions: Suggestion[];
  onHighlight?: (text: string) => void;
}

export default function SuggestionsTab({ suggestions, onHighlight }: SuggestionsTabProps) {
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
          icon: <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />,
          border: 'border-rose-500/20 bg-rose-500/5 hover:border-rose-500/35',
          titleColor: 'text-rose-300',
          badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
          labelText: 'Critical Improvement',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />,
          border: 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/35',
          titleColor: 'text-amber-300',
          badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
          labelText: 'Warning Signal',
        };
      case 'info':
        return {
          icon: <Info className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />,
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
                  <div className="text-slate-400 mt-0.5 flex-shrink-0">
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
                          {sug.occurrences.map((occ, idx) => (
                            <div
                              key={idx}
                              onClick={() => onHighlight && onHighlight(occ)}
                              className={`p-2 bg-slate-900 border border-slate-850 rounded font-mono text-[10px] text-slate-300 whitespace-pre-wrap leading-normal ${onHighlight ? 'cursor-pointer hover:bg-slate-800 transition' : ''}`}
                            >
                              {occ}
                            </div>
                          ))}
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
