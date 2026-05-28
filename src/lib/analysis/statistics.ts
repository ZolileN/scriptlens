export interface TextStatistics {
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgSentenceLength: number;
  medianSentenceLength: number;
  stdDevSentenceLength: number;
  vocabularyDiversity: number; // Type-Token Ratio
  lexicalDensity: number; // content words / total words
  fleschReadingEase: number;
  gunningFog: number;
  burstinessRaw: number; // Pop Std Dev
  burstinessNormalized: number; // Coeff of Variation (StdDev / Mean)
  sentenceDistribution: { length: number; count: number }[];
}

// Common English function words to filter out for lexical density estimation
export const FUNCTION_WORDS = new Set([
  'the', 'a', 'an', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'in', 'of',
  'to', 'by', 'with', 'from', 'as', 'into', 'about', 'is', 'was', 'were', 'been',
  'be', 'are', 'am', 'it', 'its', 'they', 'them', 'their', 'he', 'him', 'his',
  'she', 'her', 'hers', 'you', 'your', 'i', 'me', 'my', 'we', 'us', 'our', 'this',
  'that', 'these', 'those', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would',
  'should', 'could', 'can', 'may', 'might', 'must', 'so', 'then', 'there', 'here',
  'than', 'if', 'when', 'where', 'why', 'how', 'who', 'what', 'which', 'up', 'out',
  'into', 'over', 'after', 'before', 'off', 'down', 'through', 'between', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can',
  'will', 'just', 'don', 'should', 'now'
]);

// Ultra-fast sentence splitter that respects common abbreviations
export function splitSentences(text: string): string[] {
  if (!text || text.trim() === '') return [];

  // Common titles and abbreviations that end with a period but don't end sentences
  const abbreviations = /\b(mr|mrs|ms|dr|prof|sr|jr|gen|col|rep|sen|eg|ie|vs|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\./gi;
  
  // Temporarily mask abbreviation periods
  let maskedText = text.replace(abbreviations, (match: string) => {
    return match.replace('.', '___TEMP_DOT___');
  });

  // Split on sentence terminators (.!? followed by whitespace)
  const rawParts = maskedText.split(/([.!?]\s+)/);
  
  const sentences: string[] = [];
  for (let i = 0; i < rawParts.length; i += 2) {
    let part = rawParts[i];
    const terminator = rawParts[i + 1] || '';
    part = (part + terminator).replace(/___TEMP_DOT___/g, '.').trim();
    if (part.length > 0) {
      sentences.push(part);
    }
  }

  return sentences;
}

// Robust syllable counter heuristic for readability formulas
export function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length === 0) return 0;
  if (word.length <= 3) return 1;

  let tempWord = word;
  if (tempWord.endsWith('es') && !tempWord.endsWith('les')) {
    tempWord = tempWord.slice(0, -2);
  } else if (tempWord.endsWith('ed')) {
    tempWord = tempWord.slice(0, -2);
  } else if (tempWord.endsWith('e') && !tempWord.endsWith('le')) {
    tempWord = tempWord.slice(0, -1);
  }

  const vowelMatches = tempWord.match(/[aeiouy]+/g);
  const count = vowelMatches ? vowelMatches.length : 0;

  return count === 0 ? 1 : count;
}

export function analyzeStatistics(text: string): TextStatistics {
  const characterCount = text.length;

  if (characterCount === 0 || text.trim() === '') {
    return {
      characterCount: 0,
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      avgSentenceLength: 0,
      medianSentenceLength: 0,
      stdDevSentenceLength: 0,
      vocabularyDiversity: 0,
      lexicalDensity: 0,
      fleschReadingEase: 100,
      gunningFog: 0,
      burstinessRaw: 0,
      burstinessNormalized: 0,
      sentenceDistribution: [],
    };
  }

  // Paragraph segmentation (split by one or more blank lines)
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const paragraphCount = paragraphs.length;

  // Custom high-performance sentence splitter
  const sentencesText = splitSentences(text);
  const sentenceCount = sentencesText.length || 1;

  // Word tokenization
  const allWordsRaw = text.match(/[a-zA-Z0-9']+/g) || [];
  const wordCount = allWordsRaw.length;

  if (wordCount === 0) {
    return {
      characterCount,
      wordCount: 0,
      sentenceCount,
      paragraphCount,
      avgSentenceLength: 0,
      medianSentenceLength: 0,
      stdDevSentenceLength: 0,
      vocabularyDiversity: 0,
      lexicalDensity: 0,
      fleschReadingEase: 100,
      gunningFog: 0,
      burstinessRaw: 0,
      burstinessNormalized: 0,
      sentenceDistribution: [],
    };
  }

  // Calculate Vocabulary Diversity (Type-Token Ratio - TTR)
  const uniqueWords = new Set(allWordsRaw.map((w) => w.toLowerCase()));
  const vocabularyDiversity = uniqueWords.size / wordCount;

  // Calculate Lexical Density (proportion of non-function words)
  let contentWordsCount = 0;
  allWordsRaw.forEach((w: string) => {
    const cleaned = w.toLowerCase().replace(/[^a-z]/g, '');
    if (cleaned && !FUNCTION_WORDS.has(cleaned)) {
      contentWordsCount++;
    }
  });
  const lexicalDensity = contentWordsCount / wordCount;

  // Analyze Sentence Lengths
  const sentenceLengths = sentencesText.map((s: string) => {
    const words = s.match(/[a-zA-Z0-9']+/g) || [];
    return words.length;
  });

  const totalWordsInSentences = sentenceLengths.reduce((sum: number, len: number) => sum + len, 0);
  const avgSentenceLength = totalWordsInSentences / sentenceCount;

  // Median Sentence Length
  const sortedLengths = [...sentenceLengths].sort((a, b) => a - b);
  const mid = Math.floor(sortedLengths.length / 2);
  const medianSentenceLength =
    sortedLengths.length % 2 !== 0
      ? sortedLengths[mid]
      : (sortedLengths[mid - 1] + sortedLengths[mid]) / 2;

  // Standard Deviation (Population)
  const mean = avgSentenceLength;
  const variance =
    sentenceLengths.reduce((sum: number, len: number) => sum + Math.pow(len - mean, 2), 0) / sentenceCount;
  const stdDevSentenceLength = Math.sqrt(variance);

  // Burstiness metrics
  const burstinessRaw = stdDevSentenceLength;
  const burstinessNormalized = mean === 0 ? 0 : stdDevSentenceLength / mean;

  // Sentence distribution for histogram (group by ranges of 5 words)
  const distributionMap: { [key: number]: number } = {};
  sentenceLengths.forEach((len: number) => {
    const group = Math.floor((len - 1) / 5) * 5 + 5;
    distributionMap[group] = (distributionMap[group] || 0) + 1;
  });
  const sentenceDistribution = Object.keys(distributionMap)
    .map((key) => ({
      length: parseInt(key, 10),
      count: distributionMap[parseInt(key, 10)],
    }))
    .sort((a, b) => a.length - b.length);

  // Readability calculations
  let totalSyllables = 0;
  let complexWordsCount = 0;
  allWordsRaw.forEach((w: string) => {
    const syl = countSyllables(w);
    totalSyllables += syl;
    if (syl >= 3) {
      complexWordsCount++;
    }
  });

  // FRE formula
  const fleschReadingEase =
    206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (totalSyllables / wordCount);

  // Gunning Fog formula
  const gunningFog = 0.4 * (wordCount / sentenceCount + 100 * (complexWordsCount / wordCount));

  return {
    characterCount,
    wordCount,
    sentenceCount,
    paragraphCount,
    avgSentenceLength,
    medianSentenceLength,
    stdDevSentenceLength,
    vocabularyDiversity,
    lexicalDensity: Math.min(Math.max(lexicalDensity, 0), 1),
    fleschReadingEase: Math.max(0, Math.min(120, fleschReadingEase)),
    gunningFog: Math.max(0, Math.min(25, gunningFog)),
    burstinessRaw,
    burstinessNormalized,
    sentenceDistribution,
  };
}
