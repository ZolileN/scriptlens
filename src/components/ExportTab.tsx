import React, { useState } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  Eye
} from 'lucide-react';
import { TextStatistics } from '../lib/analysis/statistics';
import { PatternAnalysis } from '../lib/analysis/patterns';
import { ScoringDetails } from '../lib/analysis/scoring';
import { Suggestion } from '../lib/analysis/suggestions';

interface ExportTabProps {
  stats: TextStatistics;
  patterns: PatternAnalysis;
  scoring: ScoringDetails;
  suggestions: Suggestion[];
  rawText: string;
}

export default function ExportTab({
  stats,
  patterns,
  scoring,
  suggestions,
  rawText
}: ExportTabProps) {
  const [copied, setCopied] = useState(false);
  const [activePreview, setActivePreview] = useState<'txt' | 'json' | 'csv'>('txt');

  const getTimestamp = () => {
    return new Date().toLocaleString();
  };

  // Generate TXT report (formatted Markdown)
  const generateTxtReport = () => {
    return `==================================================
SCRIPLENS WRITING ANALYSIS REPORT
Generated: ${getTimestamp()}
==================================================

1. OVERALL SCORE & DIAGNOSTIC
--------------------------------------------------
Writing Variation Score: ${scoring.overallScore}/100
Category: ${scoring.category}

Breakdown:
- Sentence Length Variation: ${scoring.sentenceVariationScore}%
- Vocabulary Diversity:      ${scoring.vocabDiversityScore}%
- Redundancy & Repetition:   ${scoring.repetitionScore}%
- Readability Spread:        ${scoring.readabilitySpreadScore}%
- Paragraph Consistency:     ${scoring.paragraphDistributionScore}%

2. GENERAL STATISTICS
--------------------------------------------------
Character Count:           ${stats.characterCount}
Word Count:                ${stats.wordCount}
Sentence Count:            ${stats.sentenceCount}
Paragraph Count:           ${stats.paragraphCount}
Average Sentence Length:   ${stats.avgSentenceLength.toFixed(1)} words
Median Sentence Length:    ${stats.medianSentenceLength} words
Sentence Length Std Dev:   ${stats.stdDevSentenceLength.toFixed(2)} (Burstiness)
Vocabulary Diversity (TTR): ${(stats.vocabularyDiversity * 100).toFixed(1)}%
Lexical Density:           ${(stats.lexicalDensity * 100).toFixed(1)}%
Flesch Reading Ease:       ${stats.fleschReadingEase.toFixed(1)}
Gunning Fog Index:         ${stats.gunningFog.toFixed(1)} (Grade Level)

3. LINGUISTIC PATTERNS & REPETITIONS
--------------------------------------------------
Transition Word Density:   ${(patterns.transitionWordDensity * 100).toFixed(1)}%
Rhythm Flags:
- Monotonous Sentence Rhythm:  ${patterns.monotonousRhythmFlag ? 'YES' : 'NO'}
- Uniform Sentence Lengths:    ${patterns.uniformSentenceLengthsFlag ? 'YES' : 'NO'}

Repeated Words (Top 5):
${patterns.repeatedWords.slice(0, 5).map((w) => `  - "${w.word}": ${w.count} times (${(w.density * 100).toFixed(1)}% density)`).join('\n') || '  - None'}

Repeated 3-Word Phrases (Top 3):
${patterns.repeatedPhrases3Gram.slice(0, 3).map((p) => `  - "${p.phrase}": ${p.count} times`).join('\n') || '  - None'}

Repeated Sentence Openings (Top 3):
${patterns.repeatedOpenings.slice(0, 3).map((o) => `  - "${o.opening}...": ${o.count} times`).join('\n') || '  - None'}

4. SUGGESTED IMPROVEMENTS
--------------------------------------------------
${suggestions.map((sug, idx) => `${idx + 1}. [${sug.severity.toUpperCase()}] ${sug.title}
   Explanation: ${sug.explanation}
   Fix:         ${sug.suggestedFix}
`).join('\n') || 'No improvements needed!'}`;
  };

  // Generate JSON report
  const generateJsonReport = () => {
    return JSON.stringify(
      {
        reportMeta: {
          application: 'ScripLens',
          version: 'v1 MVP (Local)',
          timestamp: getTimestamp(),
        },
        scoring,
        statistics: stats,
        patterns: {
          repeatedWords: patterns.repeatedWords,
          repeatedPhrases2Gram: patterns.repeatedPhrases2Gram,
          repeatedPhrases3Gram: patterns.repeatedPhrases3Gram,
          repeatedPhrases4Gram: patterns.repeatedPhrases4Gram,
          repeatedOpenings: patterns.repeatedOpenings,
          transitionWords: patterns.transitionWords,
          transitionWordDensity: patterns.transitionWordDensity,
          monotonousRhythmFlag: patterns.monotonousRhythmFlag,
          uniformSentenceLengthsFlag: patterns.uniformSentenceLengthsFlag,
          duplicateSentences: patterns.duplicateSentences,
        },
        suggestions: suggestions.map((s) => ({
          category: s.category,
          severity: s.severity,
          title: s.title,
          explanation: s.explanation,
          suggestedFix: s.suggestedFix,
        })),
      },
      null,
      2
    );
  };

  // Generate CSV report
  const generateCsvReport = () => {
    const rows = [
      ['Metric Section', 'Metric Name', 'Metric Value', 'Linguistic Interpretation'],
      ['Scoring', 'Overall Writing Score', scoring.overallScore, scoring.category],
      ['Scoring', 'Sentence Variation Subscore', scoring.sentenceVariationScore, 'Rhythmic variety rating'],
      ['Scoring', 'Vocab Diversity Subscore', scoring.vocabDiversityScore, 'Word vocabulary depth'],
      ['Scoring', 'Repetition Subscore', scoring.repetitionScore, 'Deduction for duplicate structures'],
      ['Scoring', 'Readability Spread Subscore', scoring.readabilitySpreadScore, 'Target ease consistency'],
      ['Scoring', 'Paragraph Distribution Subscore', scoring.paragraphDistributionScore, 'Paragraph length flow'],
      ['Counts', 'Characters', stats.characterCount, 'Raw character count'],
      ['Counts', 'Words', stats.wordCount, 'Total word tokens'],
      ['Counts', 'Sentences', stats.sentenceCount, 'Total sentence count'],
      ['Counts', 'Paragraphs', stats.paragraphCount, 'Double-newline separated blocks'],
      ['Linguistics', 'Average Sentence Length', stats.avgSentenceLength.toFixed(2), 'Target average word length'],
      ['Linguistics', 'Median Sentence Length', stats.medianSentenceLength, 'Median sentence word count'],
      ['Linguistics', 'Sentence Length Std Dev', stats.stdDevSentenceLength.toFixed(2), 'Sentence length variation (Burstiness)'],
      ['Linguistics', 'Vocabulary TTR', stats.vocabularyDiversity.toFixed(4), 'Unique words / Total words'],
      ['Linguistics', 'Lexical Density', stats.lexicalDensity.toFixed(4), 'Content words (nouns/verbs/adj) ratio'],
      ['Readability', 'Flesch Reading Ease', stats.fleschReadingEase.toFixed(2), 'Reading accessibility index (0-100)'],
      ['Readability', 'Gunning Fog Index', stats.gunningFog.toFixed(2), 'Equivalent educational grade level'],
      ['Patterns', 'Transition Word Density', (patterns.transitionWordDensity * 100).toFixed(2) + '%', 'Connective words density'],
      ['Patterns', 'Monotonous Rhythm Detected', patterns.monotonousRhythmFlag ? 'True' : 'False', 'Warning for robotic layouts'],
      ['Patterns', 'Uniform Sentence Lengths', patterns.uniformSentenceLengthsFlag ? 'True' : 'False', 'Warning for equal size sentences'],
    ];

    return rows.map((row) => row.map((val) => `"${val.toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  const handleDownload = (type: 'txt' | 'json' | 'csv') => {
    let content = '';
    let filename = `scriplens_report_${Date.now()}`;

    if (type === 'txt') {
      content = generateTxtReport();
      filename += '.txt';
    } else if (type === 'json') {
      content = generateJsonReport();
      filename += '.json';
    } else if (type === 'csv') {
      content = generateCsvReport();
      filename += '.csv';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getActivePreviewContent = () => {
    if (activePreview === 'txt') return generateTxtReport();
    if (activePreview === 'json') return generateJsonReport();
    return generateCsvReport();
  };

  return (
    <div className="space-y-6">
      {/* Download Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Export Card: TXT */}
        <button
          onClick={() => handleDownload('txt')}
          className="glass-panel glass-panel-hover rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer select-none group"
        >
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 mb-3 group-hover:scale-110 transition duration-200">
            <FileText className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm text-slate-200">Export TXT Report</span>
          <span className="text-[10px] text-slate-500 mt-1 leading-relaxed">
            Human-readable Markdown document containing score cards and suggestions.
          </span>
          <div className="mt-4 px-3 py-1 bg-indigo-500/10 text-indigo-300 text-[10px] rounded-md font-bold flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> Download TXT
          </div>
        </button>

        {/* Export Card: JSON */}
        <button
          onClick={() => handleDownload('json')}
          className="glass-panel glass-panel-hover rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer select-none group"
        >
          <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400 mb-3 group-hover:scale-110 transition duration-200">
            <FileJson className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm text-slate-200">Export JSON Data</span>
          <span className="text-[10px] text-slate-500 mt-1 leading-relaxed">
            Machine-readable structured raw data for integration or custom parsing.
          </span>
          <div className="mt-4 px-3 py-1 bg-violet-500/10 text-violet-300 text-[10px] rounded-md font-bold flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> Download JSON
          </div>
        </button>

        {/* Export Card: CSV */}
        <button
          onClick={() => handleDownload('csv')}
          className="glass-panel glass-panel-hover rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer select-none group"
        >
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 mb-3 group-hover:scale-110 transition duration-200">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm text-slate-200">Export CSV Table</span>
          <span className="text-[10px] text-slate-500 mt-1 leading-relaxed">
            Tabular structure of numerical metrics ready for Excel or analysis tools.
          </span>
          <div className="mt-4 px-3 py-1 bg-teal-500/10 text-teal-300 text-[10px] rounded-md font-bold flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> Download CSV
          </div>
        </button>
      </div>

      {/* Checklist Summary */}
      <div className="glass-panel rounded-2xl p-5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Export Contents Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Variation Scores</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>General Statistics</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Repetition Flags</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Actionable Suggestions</span>
          </div>
        </div>
      </div>

      {/* Export Preview Area */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col h-[320px]">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-indigo-400" /> Live Data Preview
          </h4>
          <div className="flex bg-slate-900/80 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setActivePreview('txt')}
              className={`px-2.5 py-1 text-[10px] rounded font-bold transition ${
                activePreview === 'txt' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TXT
            </button>
            <button
              onClick={() => setActivePreview('json')}
              className={`px-2.5 py-1 text-[10px] rounded font-bold transition ${
                activePreview === 'json' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              JSON
            </button>
            <button
              onClick={() => setActivePreview('csv')}
              className={`px-2.5 py-1 text-[10px] rounded font-bold transition ${
                activePreview === 'csv' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CSV
            </button>
          </div>
        </div>

        <div className="flex-grow bg-slate-950/80 border border-slate-900 rounded-xl overflow-hidden flex">
          <pre className="flex-grow p-4 font-mono text-[10px] text-slate-300 overflow-y-auto whitespace-pre-wrap leading-normal select-all">
            {getActivePreviewContent()}
          </pre>
        </div>
      </div>
    </div>
  );
}
