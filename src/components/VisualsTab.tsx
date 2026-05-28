'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { TextStatistics } from '../lib/analysis/statistics';
import { PatternAnalysis } from '../lib/analysis/patterns';
import { BarChart, Activity } from 'lucide-react';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface VisualsTabProps {
  stats: TextStatistics;
  patterns: PatternAnalysis;
}

export default function VisualsTab({ stats, patterns }: VisualsTabProps) {
  // Chart 1: Sentence Length Distribution
  const distLabels = stats.sentenceDistribution.map((d) => `${d.length - 4}-${d.length} w`);
  const distData = stats.sentenceDistribution.map((d) => d.count);

  const sentenceLengthData = {
    labels: distLabels.length > 0 ? distLabels : ['No Sentences'],
    datasets: [
      {
        label: 'Sentence Count',
        data: distData.length > 0 ? distData : [0],
        backgroundColor: 'rgba(99, 102, 241, 0.45)', // Indigo
        borderColor: 'rgba(99, 102, 241, 0.95)',
        borderWidth: 1.5,
        borderRadius: 6,
        hoverBackgroundColor: 'rgba(99, 102, 241, 0.7)',
      },
    ],
  };

  const sentenceLengthOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
          },
          precision: 0,
        },
      },
    },
  };

  // Chart 2: Top Word Frequency
  const wordLabels = patterns.repeatedWords.slice(0, 8).map((w) => w.word);
  const wordData = patterns.repeatedWords.slice(0, 8).map((w) => w.count);

  const wordFrequencyData = {
    labels: wordLabels.length > 0 ? wordLabels : ['None'],
    datasets: [
      {
        label: 'Frequency Count',
        data: wordData.length > 0 ? wordData : [0],
        backgroundColor: 'rgba(168, 85, 247, 0.45)', // Purple
        borderColor: 'rgba(168, 85, 247, 0.95)',
        borderWidth: 1.5,
        borderRadius: 6,
        hoverBackgroundColor: 'rgba(168, 85, 247, 0.7)',
      },
    ],
  };

  const wordFrequencyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Horizontal bars
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
          },
          precision: 0,
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11,
            weight: 'bold' as const,
          },
        },
      },
    },
  };

  // Readability visual scale helper
  const getFleschMarkerPos = (fre: number) => {
    // scale from 0 to 100 fre to 0% to 100% width
    return Math.max(0, Math.min(100, fre));
  };

  return (
    <div className="space-y-6">
      {/* Readability Spread Meter */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-cyan-400" /> Readability Index Scale
          </h4>
          <span className="text-xs font-semibold text-slate-300">Flesch Score: {stats.fleschReadingEase.toFixed(1)}</span>
        </div>

        {/* Gradient Readability Bar */}
        <div className="relative mt-5 mb-8">
          <div className="h-4 w-full rounded-full bg-linear-to-r from-rose-500 via-amber-500 to-emerald-500" />

          {/* Marker Pin */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -ml-2 transition-all duration-1000 ease-out"
            style={{ left: `${getFleschMarkerPos(stats.fleschReadingEase)}%` }}
          >
            <div className="w-4 h-4 rounded-full border-2 border-white bg-slate-950 shadow-lg flex items-center justify-center relative">
              <div className="absolute bottom-5 bg-slate-900 border border-slate-700 text-[10px] text-white px-2 py-0.5 rounded-md whitespace-nowrap shadow-md">
                Your Level ({stats.fleschReadingEase.toFixed(0)})
              </div>
            </div>
          </div>
        </div>

        {/* Readability Labels */}
        <div className="grid grid-cols-4 text-[10px] text-slate-400 font-semibold text-center mt-2 border-t border-slate-800/60 pt-3">
          <div className="text-left">
            <div className="text-rose-400 font-bold">Academic</div>
            <div>0–30 Score</div>
          </div>
          <div>
            <div className="text-amber-400 font-bold">Technical</div>
            <div>30–60 Score</div>
          </div>
          <div>
            <div className="text-cyan-400 font-bold">Standard</div>
            <div>60–80 Score</div>
          </div>
          <div className="text-right">
            <div className="text-emerald-400 font-bold">Conversational</div>
            <div>80–100 Score</div>
          </div>
        </div>
      </div>

      {/* Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart: Sentence Length Histogram */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col h-[320px]">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <BarChart className="w-4 h-4 text-indigo-400" /> Sentence Length Distribution
          </h4>
          <div className="grow relative">
            {stats.sentenceCount === 0 ? (
              <p className="text-xs text-slate-500 flex items-center justify-center h-full">Enter text to view sentence metrics</p>
            ) : (
              <Bar data={sentenceLengthData} options={sentenceLengthOptions} />
            )}
          </div>
        </div>

        {/* Chart: Word Frequency */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col h-[320px]">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <BarChart className="w-4 h-4 text-purple-400" /> Top Word Frequency
          </h4>
          <div className="grow relative">
            {patterns.repeatedWords.length === 0 ? (
              <p className="text-xs text-slate-500 flex items-center justify-center h-full">No word repetitions found</p>
            ) : (
              <Bar data={wordFrequencyData} options={wordFrequencyOptions} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
