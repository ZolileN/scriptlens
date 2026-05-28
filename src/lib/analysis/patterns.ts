import { splitSentences } from './statistics';

export interface PhraseRepetition {
  phrase: string;
  count: number;
}

export interface SentenceOpeningRepetition {
  opening: string;
  count: number;
  sentenceIndices: number[];
}

export interface TransitionWordMetric {
  word: string;
  count: number;
}

export interface PatternAnalysis {
  repeatedWords: { word: string; count: number; density: number }[];
  repeatedPhrases2Gram: PhraseRepetition[];
  repeatedPhrases3Gram: PhraseRepetition[];
  repeatedPhrases4Gram: PhraseRepetition[];
  repeatedOpenings: SentenceOpeningRepetition[];
  transitionWords: TransitionWordMetric[];
  transitionWordDensity: number;
  uniformSentenceLengthsFlag: boolean;
  monotonousRhythmFlag: boolean;
  duplicateSentences: { text: string; count: number; indices: number[] }[];
}

// Standard English transition words/phrases (lowercased)
export const TRANSITION_WORDS = [
  'however', 'therefore', 'furthermore', 'moreover', 'meanwhile',
  'consequently', 'specifically', 'additionally', 'consequently',
  'nevertheless', 'nonetheless', 'subsequently', 'similarly',
  'consequently', 'likewise', 'correspondingly', 'alternatively',
  'conversely', 'meanwhile', 'finally', 'thus', 'hence',
  'in contrast', 'on the other hand', 'as a result', 'for example',
  'in addition', 'for instance', 'in fact', 'as an illustration',
  'to illustrate', 'in summary', 'to conclude', 'on the contrary'
];

// Clean word helper
function cleanWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, '').trim();
}

export function analyzePatterns(text: string): PatternAnalysis {
  if (!text || text.trim() === '') {
    return {
      repeatedWords: [],
      repeatedPhrases2Gram: [],
      repeatedPhrases3Gram: [],
      repeatedPhrases4Gram: [],
      repeatedOpenings: [],
      transitionWords: [],
      transitionWordDensity: 0,
      uniformSentenceLengthsFlag: false,
      monotonousRhythmFlag: false,
      duplicateSentences: [],
    };
  }

  // Tokenize sentences using custom high-performance sentence splitter
  const sentences = splitSentences(text);

  // Tokenize all words cleanly
  const allWordsRaw = text.match(/[a-zA-Z0-9']+/g) || [];
  const totalWordCount = allWordsRaw.length;
  const cleanedWords = allWordsRaw.map(cleanWord).filter((w) => w.length > 0);

  // 1. Repeated Words (exclude common stop words unless repeated extremely heavily)
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'in', 'of',
    'to', 'by', 'with', 'from', 'as', 'into', 'about', 'is', 'was', 'were', 'been',
    'be', 'are', 'am', 'it', 'its', 'they', 'them', 'their', 'he', 'him', 'his',
    'she', 'her', 'hers', 'you', 'your', 'i', 'me', 'my', 'we', 'us', 'our', 'this',
    'that', 'these', 'those', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would',
    'should', 'could', 'can', 'may', 'might', 'must', 'so', 'then', 'there', 'here',
    'than', 'then', 'if', 'when', 'where', 'why', 'how', 'who', 'what', 'which'
  ]);

  const wordCounts: { [key: string]: number } = {};
  cleanedWords.forEach((w: string) => {
    wordCounts[w] = (wordCounts[w] || 0) + 1;
  });

  const repeatedWords = Object.keys(wordCounts)
    .filter((w) => !STOP_WORDS.has(w) && wordCounts[w] > 2) // Repeating non-stop words
    .map((w) => ({
      word: w,
      count: wordCounts[w],
      density: wordCounts[w] / (totalWordCount || 1),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // 2. Phrase Repetition (n-grams of size 2, 3, 4)
  const getNgrams = (words: string[], n: number): PhraseRepetition[] => {
    const ngramsMap: { [key: string]: number } = {};
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join(' ');
      // Simple filter to make sure it contains useful words (not just stop words like "of the and")
      const phraseWords = phrase.split(' ');
      const hasContentWord = phraseWords.some((pw: string) => !STOP_WORDS.has(pw));
      if (hasContentWord) {
        ngramsMap[phrase] = (ngramsMap[phrase] || 0) + 1;
      }
    }
    return Object.keys(ngramsMap)
      .filter((p) => ngramsMap[p] > 1) // repeats
      .map((p) => ({ phrase: p, count: ngramsMap[p] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const repeatedPhrases2Gram = getNgrams(cleanedWords, 2);
  const repeatedPhrases3Gram = getNgrams(cleanedWords, 3);
  const repeatedPhrases4Gram = getNgrams(cleanedWords, 4);

  // 3. Repeated Sentence Openings
  // Extract the first 2-3 words of each sentence
  const openingMap: { [key: string]: { count: number; indices: number[] } } = {};
  sentences.forEach((sentence: string, idx: number) => {
    const words = sentence.match(/[a-zA-Z0-9']+/g) || [];
    if (words.length >= 2) {
      // First 2 words or first 3 words
      const opening2 = words.slice(0, 2).map((w: string) => w.toLowerCase()).join(' ');
      if (!openingMap[opening2]) {
        openingMap[opening2] = { count: 0, indices: [] };
      }
      openingMap[opening2].count++;
      openingMap[opening2].indices.push(idx);
    }
  });

  const repeatedOpenings = Object.keys(openingMap)
    .filter((op) => openingMap[op].count > 1)
    .map((op) => ({
      opening: op,
      count: openingMap[op].count,
      sentenceIndices: openingMap[op].indices,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 4. Transition Word Frequency
  const transitionWordCounts: { [key: string]: number } = {};
  let transitionWordTotal = 0;
  
  // Clean lowercased text for phrase transition searches (e.g. "on the other hand")
  const textLower = text.toLowerCase();
  TRANSITION_WORDS.forEach((tw) => {
    // Escape special regex characters
    const escapedTw = tw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Regex matching transition word/phrase with word boundaries
    const regex = new RegExp(`\\b${escapedTw}\\b`, 'g');
    const matches = textLower.match(regex);
    if (matches) {
      transitionWordCounts[tw] = (transitionWordCounts[tw] || 0) + matches.length;
      transitionWordTotal += matches.length;
    }
  });

  const transitionWords = Object.keys(transitionWordCounts)
    .map((tw) => ({
      word: tw,
      count: transitionWordCounts[tw],
    }))
    .sort((a, b) => b.count - a.count);

  const transitionWordDensity = totalWordCount === 0 ? 0 : transitionWordTotal / totalWordCount;

  // 5. Rhythm Flags: Uniform sentence lengths, Monotonous rhythm
  // Calculate average and standard deviation of sentence lengths
  const sentenceLengths = sentences.map((s: string) => {
    const words = s.match(/[a-zA-Z0-9']+/g) || [];
    return words.length;
  });

  let uniformSentenceLengthsFlag = false;
  let monotonousRhythmFlag = false;

  if (sentenceLengths.length >= 4) {
    const sum = sentenceLengths.reduce((acc: number, len: number) => acc + len, 0);
    const mean = sum / sentenceLengths.length;
    const variance = sentenceLengths.reduce((acc: number, len: number) => acc + Math.pow(len - mean, 2), 0) / sentenceLengths.length;
    const stdDev = Math.sqrt(variance);

    // If std deviation is small, it indicates uniform sentence lengths (monotonous rhythm)
    // E.g. standard deviation less than 3.0 words for moderate-sized sentences
    if (stdDev < 3.5 && mean > 5) {
      uniformSentenceLengthsFlag = true;
    }
    // Coefficient of variation is stdDev / mean. If CV is < 0.25, it means sentences are extremely uniform
    if (mean > 0 && stdDev / mean < 0.22) {
      monotonousRhythmFlag = true;
    }
  }

  // 6. Duplicate Sentences
  const sentenceCountMap: { [key: string]: { count: number; indices: number[] } } = {};
  sentences.forEach((sentence: string, idx: number) => {
    const cleanSent = sentence.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (cleanSent.length > 15) { // Only flag substantial sentences
      if (!sentenceCountMap[cleanSent]) {
        sentenceCountMap[cleanSent] = { count: 0, indices: [] };
      }
      sentenceCountMap[cleanSent].count++;
      sentenceCountMap[cleanSent].indices.push(idx);
    }
  });

  const duplicateSentences = Object.keys(sentenceCountMap)
    .filter((key) => sentenceCountMap[key].count > 1)
    .map((key) => {
      // Find the original sentence text for this clean key
      const idx = sentenceCountMap[key].indices[0];
      return {
        text: sentences[idx],
        count: sentenceCountMap[key].count,
        indices: sentenceCountMap[key].indices,
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    repeatedWords,
    repeatedPhrases2Gram,
    repeatedPhrases3Gram,
    repeatedPhrases4Gram,
    repeatedOpenings,
    transitionWords,
    transitionWordDensity,
    uniformSentenceLengthsFlag,
    monotonousRhythmFlag,
    duplicateSentences,
  };
}
