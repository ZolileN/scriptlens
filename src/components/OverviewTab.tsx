import React from 'react';
import {
  FileText,
  Layers,
  BookOpen,
  TrendingUp,
  Activity,
  Award,
  Sparkles,
  RefreshCw,
  Hash
} from 'lucide-react';
import { TextStatistics } from '../lib/analysis/statistics';
import { ScoringDetails } from '../lib/analysis/scoring';

interface OverviewTabProps {
  stats: TextStatistics;
  scoring: ScoringDetails;
}

export default function OverviewTab({ stats, scoring }: OverviewTabProps) {
  const getReadabilityDescription = (fre: number) => {
    if (fre >= 90) return { label: 'Very Easy', desc: '5th grade reading level. Simple and accessible.', color: 'text-emerald-400 bg-emerald-500/10' };
    if (fre >= 80) return { label: 'Easy', desc: '6th grade reading level. Conversational language.', color: 'text-green-400 bg-green-500/10' };
    if (fre >= 70) return { label: 'Fairly Easy', desc: '7th grade reading level. Easy to read.', color: 'text-teal-400 bg-teal-500/10' };
    if (fre >= 60) return { label: 'Plain English', desc: '8th–9th grade level. Clear and average.', color: 'text-cyan-400 bg-cyan-500/10' };
    if (fre >= 50) return { label: 'Fairly Difficult', desc: '10th–12th grade level. Slightly complex.', color: 'text-amber-400 bg-amber-500/10' };
    if (fre >= 30) return { label: 'Difficult', desc: 'College level. Academic or technical.', color: 'text-orange-400 bg-orange-500/10' };
    return { label: 'Very Difficult', desc: 'Graduate level. Extremely dense/scholarly.', color: 'text-rose-400 bg-rose-500/10' };
  };

  const readability = getReadabilityDescription(stats.fleschReadingEase);

  // SVG Gauge calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const scorePercent = scoring.overallScore / 100;
  const strokeDashoffset = circumference - scorePercent * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'stroke-indigo-500 text-indigo-400';
    if (score >= 50) return 'stroke-violet-500 text-violet-400';
    return 'stroke-amber-500 text-amber-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'from-indigo-500/20 to-purple-500/20 text-indigo-300';
    if (score >= 50) return 'from-violet-500/20 to-indigo-500/20 text-violet-300';
    return 'from-amber-500/20 to-orange-500/20 text-amber-300';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Variation Score & Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Dial Glass Box */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 animate-glow" />
          <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
            <Award className="w-4 h-4 text-indigo-400" /> Writing Variation Score
          </h3>

          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r={radius}
                className={`transition-all duration-1000 ease-out ${getScoreColor(scoring.overallScore)}`}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-white tracking-tight">{scoring.overallScore}</span>
              <span className="text-xs text-slate-400 uppercase tracking-widest mt-0.5">Scale 0-100</span>
            </div>
          </div>

          <div className={`mt-5 px-3 py-1.5 rounded-full text-xs font-bold bg-linear-to-r ${getScoreBgColor(scoring.overallScore)} shadow-inner`}>
            {scoring.category}
          </div>

          <p className="text-xs text-slate-400 mt-4 leading-relaxed max-w-[200px]">
            Determined by sentence lengths, word diversity, readability levels, and structure consistency.
          </p>
        </div>

        {/* Sub-Score Progress Bars */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-400 mb-5 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-violet-400" /> Variation Breakdown
            </h3>
            <div className="space-y-4">
              {/* Sentence Variation (30%) */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-300 flex items-center gap-1">Sentence length variation <span className="text-slate-500 font-normal">(30% weight)</span></span>
                  <span className="text-indigo-400 font-bold">{scoring.sentenceVariationScore}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-1000"
                    style={{ width: `${scoring.sentenceVariationScore}%` }}
                  />
                </div>
              </div>

              {/* Vocabulary Diversity (20%) */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-300 flex items-center gap-1">Vocabulary diversity <span className="text-slate-500 font-normal">(20% weight)</span></span>
                  <span className="text-violet-400 font-bold">{scoring.vocabDiversityScore}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-1000"
                    style={{ width: `${scoring.vocabDiversityScore}%` }}
                  />
                </div>
              </div>

              {/* Repetition Score (20%) */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-300 flex items-center gap-1">Redundancy & Repetition <span className="text-slate-500 font-normal">(20% weight)</span></span>
                  <span className="text-fuchsia-400 font-bold">{scoring.repetitionScore}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-fuchsia-500 to-fuchsia-400 rounded-full transition-all duration-1000"
                    style={{ width: `${scoring.repetitionScore}%` }}
                  />
                </div>
              </div>

              {/* Readability Score (15%) */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-300 flex items-center gap-1">Readability spread <span className="text-slate-500 font-normal">(15% weight)</span></span>
                  <span className="text-cyan-400 font-bold">{scoring.readabilitySpreadScore}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-1000"
                    style={{ width: `${scoring.readabilitySpreadScore}%` }}
                  />
                </div>
              </div>

              {/* Paragraph distribution (15%) */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-300 flex items-center gap-1">Paragraph consistency <span className="text-slate-500 font-normal">(15% weight)</span></span>
                  <span className="text-teal-400 font-bold">{scoring.paragraphDistributionScore}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-1000"
                    style={{ width: `${scoring.paragraphDistributionScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Statistics Matrix */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Metrics Inventory</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card: Words */}
          <div className="glass-panel rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">{stats.wordCount.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Total Words</div>
            </div>
          </div>

          {/* Card: Characters */}
          <div className="glass-panel rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-violet-500/10 text-violet-400">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">{stats.characterCount.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Characters</div>
            </div>
          </div>

          {/* Card: Sentences */}
          <div className="glass-panel rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-fuchsia-500/10 text-fuchsia-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">{stats.sentenceCount.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Sentences</div>
            </div>
          </div>

          {/* Card: Paragraphs */}
          <div className="glass-panel rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">{stats.paragraphCount.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Paragraphs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Linguistic & Rhythmic Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Readability Box */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Readability Ease</h4>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${readability.color}`}>
                {readability.label}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {stats.fleschReadingEase.toFixed(1)}
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {readability.desc} Lower numbers represent complex structures, while higher scores indicate readable prose.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">Gunning Fog Index</span>
            <span className="font-semibold text-slate-200">Grade {stats.gunningFog.toFixed(1)}</span>
          </div>
        </div>

        {/* Rhythm / Burstiness */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Burstiness & Flow
            </h4>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {stats.stdDevSentenceLength.toFixed(1)} <span className="text-xs font-normal text-slate-400">words</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Standard deviation of sentence lengths. Higher variation (burstiness) keeps readers engaged, while uniform lengths feel robotic.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">Average Sentence Length</span>
            <span className="font-semibold text-slate-200">{stats.avgSentenceLength.toFixed(1)} words</span>
          </div>
        </div>

        {/* Vocabulary Diversity & Lexical Density */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-violet-400" /> Lexical Density
            </h4>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {(stats.lexicalDensity * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The proportion of content-carrying words (nouns, verbs, adjectives, adverbs). High lexical density indicates dense information.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">Vocabulary TTR Diversity</span>
            <span className="font-semibold text-slate-200">{(stats.vocabularyDiversity * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
