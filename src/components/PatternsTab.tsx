import React from 'react';
import {
  HelpCircle,
  Copy,
  ArrowRightLeft,
  ChevronRight,
  TrendingUp,
  FileWarning
} from 'lucide-react';
import { PatternAnalysis } from '../lib/analysis/patterns';

interface PatternsTabProps {
  patterns: PatternAnalysis;
}

export default function PatternsTab({ patterns }: PatternsTabProps) {
  return (
    <div className="space-y-6">
      {/* Rhythm Flags if present */}
      {(patterns.uniformSentenceLengthsFlag || patterns.monotonousRhythmFlag) && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-3">
          <FileWarning className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm">Monotonous Rhythm Alert</div>
            <p className="text-xs text-amber-400/80 mt-1 leading-relaxed">
              Your writing uses highly uniform sentence structures and lengths. Try inserting short punchy sentences or long compound sentences to make the style more conversational.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Repeated Words & Transition Words */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box: Repeated Words */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center justify-between uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><Copy className="w-4 h-4 text-violet-400" /> Word Repetitions</span>
            <span className="text-[10px] text-slate-500 font-normal">Excludes stop words</span>
          </h3>

          {patterns.repeatedWords.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No excessive word repetitions found.</p>
          ) : (
            <div className="space-y-3 flex-grow overflow-y-auto max-h-[280px] pr-1">
              {patterns.repeatedWords.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex flex-col">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-300">"{item.word}"</span>
                    <span className="text-slate-400">{item.count} times <span className="text-[10px] text-slate-600">({(item.density * 100).toFixed(1)}%)</span></span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                      style={{ width: `${Math.min(100, item.density * 800)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Box: Transition Words */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center justify-between uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><ArrowRightLeft className="w-4 h-4 text-emerald-400" /> Transition Words</span>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {(patterns.transitionWordDensity * 100).toFixed(1)}% Density
            </span>
          </h3>

          {patterns.transitionWords.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No standard transition words detected.</p>
          ) : (
            <div className="space-y-2.5 flex-grow overflow-y-auto max-h-[280px] pr-1">
              {patterns.transitionWords.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900 transition border border-transparent hover:border-slate-800">
                  <span className="font-medium text-slate-300 capitalize">{item.word}</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-400">
                    {item.count} occurrences
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Duplicate Openings and Duplicate Sentences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box: Repeated Openings */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-fuchsia-400" /> Repeated Sentence Openings
          </h3>

          {patterns.repeatedOpenings.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Your sentence openings are well diversified!</p>
          ) : (
            <div className="space-y-3 flex-grow overflow-y-auto max-h-[280px] pr-1">
              {patterns.repeatedOpenings.slice(0, 6).map((op, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                  <div className="flex justify-between items-center mb-1.5 text-xs">
                    <span className="font-semibold text-fuchsia-400 capitalize">"{op.opening}..."</span>
                    <span className="text-[10px] font-medium bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      Repeated {op.count}x
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Sentence Indices: {op.sentenceIndices.map((i) => `#${i + 1}`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Box: Duplicate Sentences */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
            <FileWarning className="w-4 h-4 text-amber-400" /> Duplicate Sentences
          </h3>

          {patterns.duplicateSentences.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No identical duplicate sentences found.</p>
          ) : (
            <div className="space-y-3 flex-grow overflow-y-auto max-h-[280px] pr-1">
              {patterns.duplicateSentences.slice(0, 5).map((dup, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <div className="flex justify-between items-start mb-1 text-xs">
                    <p className="font-medium text-slate-200 line-clamp-2">"{dup.text}"</p>
                    <span className="ml-2 flex-shrink-0 text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">
                      {dup.count}x Matches
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Occurs at Sentence: {dup.indices.map((i) => `#${i + 1}`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Phrase Repetition (2-Gram, 3-Gram, 4-Gram) */}
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
          <HelpCircle className="w-4 h-4 text-cyan-400" /> Repeating Phrase Patterns (N-Grams)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 2-Word Patterns */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 mb-2 pb-1 border-b border-slate-800">2-Word Phrases</h4>
            {patterns.repeatedPhrases2Gram.length === 0 ? (
              <p className="text-[10px] text-slate-500 py-4 text-center">None found</p>
            ) : (
              <div className="space-y-1.5">
                {patterns.repeatedPhrases2Gram.slice(0, 5).map((p, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] p-1.5 rounded hover:bg-slate-900 transition">
                    <span className="text-slate-300 truncate max-w-[120px]">"{p.phrase}"</span>
                    <span className="text-slate-500 font-bold">{p.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3-Word Patterns */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 mb-2 pb-1 border-b border-slate-800">3-Word Phrases</h4>
            {patterns.repeatedPhrases3Gram.length === 0 ? (
              <p className="text-[10px] text-slate-500 py-4 text-center">None found</p>
            ) : (
              <div className="space-y-1.5">
                {patterns.repeatedPhrases3Gram.slice(0, 5).map((p, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] p-1.5 rounded hover:bg-slate-900 transition">
                    <span className="text-slate-300 truncate max-w-[120px]">"{p.phrase}"</span>
                    <span className="text-slate-500 font-bold">{p.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4-Word Patterns */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 mb-2 pb-1 border-b border-slate-800">4-Word Phrases</h4>
            {patterns.repeatedPhrases4Gram.length === 0 ? (
              <p className="text-[10px] text-slate-500 py-4 text-center">None found</p>
            ) : (
              <div className="space-y-1.5">
                {patterns.repeatedPhrases4Gram.slice(0, 5).map((p, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] p-1.5 rounded hover:bg-slate-900 transition">
                    <span className="text-slate-300 truncate max-w-[120px]">"{p.phrase}"</span>
                    <span className="text-slate-500 font-bold">{p.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
