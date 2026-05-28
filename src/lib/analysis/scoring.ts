import { PatternAnalysis } from './patterns';
import { TextStatistics } from './statistics';

export interface ScoringDetails {
  overallScore: number;
  category: 'Low variation' | 'Moderate variation' | 'High variation';
  sentenceVariationScore: number;
  vocabDiversityScore: number;
  repetitionScore: number;
  readabilitySpreadScore: number;
  paragraphDistributionScore: number;
}

export function calculateWritingScore(
  text: string,
  stats: TextStatistics,
  patterns: PatternAnalysis
): ScoringDetails {
  if (!text || text.trim() === '' || stats.wordCount === 0) {
    return {
      overallScore: 0,
      category: 'Low variation',
      sentenceVariationScore: 0,
      vocabDiversityScore: 0,
      repetitionScore: 0,
      readabilitySpreadScore: 0,
      paragraphDistributionScore: 0,
    };
  }

  // 1. Sentence Variation Score (30% weight)
  // Based on Coefficient of Variation (StdDev / Mean)
  // Highly varied writing has CV >= 0.5. Monotonous writing has CV <= 0.15.
  let sentenceVariationScore = 0;
  if (stats.sentenceCount >= 2 && stats.avgSentenceLength > 0) {
    const cv = stats.burstinessNormalized; // StdDev / Mean
    if (cv >= 0.55) {
      sentenceVariationScore = 100;
    } else if (cv <= 0.1) {
      sentenceVariationScore = 20;
    } else {
      // Linear interpolation between (0.1, 20) and (0.55, 100)
      sentenceVariationScore = 20 + ((cv - 0.1) / (0.55 - 0.1)) * 80;
    }
  } else {
    // If only one sentence, no variation is possible
    sentenceVariationScore = stats.wordCount > 15 ? 40 : 10;
  }
  sentenceVariationScore = Math.max(0, Math.min(100, sentenceVariationScore));

  // 2. Vocabulary Diversity Score (20% weight)
  // Based on TTR, adjusted for length because TTR naturally drops in longer texts.
  let vocabDiversityScore = 0;
  const wCount = stats.wordCount;
  const ttr = stats.vocabularyDiversity;

  let expectedTtr = 0.65;
  if (wCount < 50) {
    expectedTtr = 0.80;
  } else if (wCount < 200) {
    expectedTtr = 0.65;
  } else if (wCount < 1000) {
    expectedTtr = 0.48;
  } else {
    expectedTtr = 0.35;
  }

  const ratio = ttr / expectedTtr;
  if (ratio >= 1.1) {
    vocabDiversityScore = 100;
  } else if (ratio <= 0.4) {
    vocabDiversityScore = 20;
  } else {
    // Interpolate between (0.4, 20) and (1.1, 100)
    vocabDiversityScore = 20 + ((ratio - 0.4) / (1.1 - 0.4)) * 80;
  }
  vocabDiversityScore = Math.max(0, Math.min(100, vocabDiversityScore));

  // 3. Repetition Score (20% weight)
  // Start at 100, deduct for heavy repetitions of words and phrases.
  let repetitionScore = 100;

  // Deduct for 3-grams and 4-grams that repeat
  patterns.repeatedPhrases3Gram.forEach((p) => {
    repetitionScore -= Math.min(15, p.count * 3);
  });
  patterns.repeatedPhrases4Gram.forEach((p) => {
    repetitionScore -= Math.min(20, p.count * 4);
  });

  // Deduct for repeating sentence openings
  patterns.repeatedOpenings.forEach((op) => {
    if (op.count >= 3) {
      repetitionScore -= 10;
    } else {
      repetitionScore -= 4;
    }
  });

  // Deduct for excessive duplicate sentences
  patterns.duplicateSentences.forEach((dup) => {
    repetitionScore -= (dup.count - 1) * 20;
  });

  repetitionScore = Math.max(0, Math.min(100, repetitionScore));

  // 4. Readability Spread Score (15% weight)
  // High score if FRE is in the optimal range (50 to 80), lower if extremely simple or dense.
  let readabilitySpreadScore = 100;
  const fre = stats.fleschReadingEase;
  if (fre >= 50 && fre <= 80) {
    readabilitySpreadScore = 100;
  } else if (fre > 80) {
    // Very easy (e.g. children's book): deduct slightly because of low writing complexity (if that's the goal)
    const diff = fre - 80;
    readabilitySpreadScore = 100 - diff * 1.5;
  } else {
    // Very hard (academic/dense): deduct as it is difficult to read
    const diff = 50 - fre;
    readabilitySpreadScore = 100 - diff * 2.0;
  }
  readabilitySpreadScore = Math.max(15, Math.min(100, readabilitySpreadScore));

  // 5. Paragraph Distribution Score (15% weight)
  // Evaluate if paragraph sizes are reasonably balanced or heavily skewed.
  let paragraphDistributionScore = 100;
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length >= 3) {
    const paraWordCounts = paragraphs.map((p) => {
      const words = p.match(/[a-zA-Z0-9']+/g) || [];
      return words.length;
    });

    const sumParaWords = paraWordCounts.reduce((sum, w) => sum + w, 0);
    const meanParaWords = sumParaWords / paragraphs.length;

    const varianceParaWords =
      paraWordCounts.reduce((sum, w) => sum + Math.pow(w - meanParaWords, 2), 0) /
      paragraphs.length;
    const stdDevParaWords = Math.sqrt(varianceParaWords);

    const paraCv = meanParaWords === 0 ? 0 : stdDevParaWords / meanParaWords;

    if (paraCv <= 0.35) {
      paragraphDistributionScore = 100;
    } else if (paraCv >= 1.2) {
      paragraphDistributionScore = 30;
    } else {
      // Interpolate between (0.35, 100) and (1.2, 30)
      paragraphDistributionScore = 100 - ((paraCv - 0.35) / (1.2 - 0.35)) * 70;
    }

    // Penalize if some paragraphs are excessively long (>150 words)
    paraWordCounts.forEach((cnt) => {
      if (cnt > 150) {
        paragraphDistributionScore -= 10;
      }
    });
  } else if (paragraphs.length === 2) {
    paragraphDistributionScore = 80; // Moderate consistency penalty
  } else {
    // 1 paragraph or empty
    paragraphDistributionScore = stats.wordCount > 120 ? 50 : 90; // single huge block vs small text
  }
  paragraphDistributionScore = Math.max(0, Math.min(100, paragraphDistributionScore));

  // Dynamic Weighting based on Text Length
  let wSentenceVariation = 0.3;
  let wVocabDiversity = 0.2;
  let wRepetition = 0.2;
  let wReadability = 0.15;
  let wParagraph = 0.15;

  // Short texts don't have enough words for vocabulary or repetition to be meaningful
  if (stats.wordCount < 150) {
    wSentenceVariation = 0.60;
    wVocabDiversity = 0.05;
    wRepetition = 0.05;
    wReadability = 0.20;
    wParagraph = 0.10;
  }

  // Weighted aggregate score
  let overallScore =
    wSentenceVariation * sentenceVariationScore +
    wVocabDiversity * vocabDiversityScore +
    wRepetition * repetitionScore +
    wReadability * readabilitySpreadScore +
    wParagraph * paragraphDistributionScore;

  // Burstiness Multiplier Penalty (Strict AI Pattern Detection)
  // If sentences are uniformly robotic (low std dev), heavily penalize the score
  if (stats.sentenceCount >= 3 && stats.stdDevSentenceLength < 1.5) {
    overallScore *= 0.5;
  }

  const roundedScore = Math.round(overallScore);

  let category: 'Low variation' | 'Moderate variation' | 'High variation' = 'Moderate variation';
  if (roundedScore < 50) {
    category = 'Low variation';
  } else if (roundedScore >= 80) {
    category = 'High variation';
  }

  return {
    overallScore: roundedScore,
    category,
    sentenceVariationScore: Math.round(sentenceVariationScore),
    vocabDiversityScore: Math.round(vocabDiversityScore),
    repetitionScore: Math.round(repetitionScore),
    readabilitySpreadScore: Math.round(readabilitySpreadScore),
    paragraphDistributionScore: Math.round(paragraphDistributionScore),
  };
}
