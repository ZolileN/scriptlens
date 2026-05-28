import nlp from 'compromise';
import { splitSentences, TextStatistics } from './statistics';
import { PatternAnalysis } from './patterns';

export interface Suggestion {
  id: string;
  category: 'sentence' | 'repetition' | 'style' | 'paragraph' | 'rhythm';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  explanation: string;
  suggestedFix: string;
  occurrences: string[];
}

// Regex for common passive voice structures in English
// matches a form of "to be" followed by a word ending in "ed" or common irregular past participles
export const PASSIVE_VOICE_REGEX = /\b(am|is|are|was|were|be|been|being)\b\s+(\w+ed|written|taken|seen|done|known|built|chosen|given|shown|told|held|brought|kept|begun|broken|driven|eaten|fallen|forgotten|frozen|grown|hurt|lost|made|paid|run|sent|spoken|spent|understood|won)\b/gi;

export interface HighlightOccurrence {
  text: string;
  type: 'passive' | 'long-sentence';
  startIndex: number;
  endIndex: number;
}

export function detectHighlights(text: string): HighlightOccurrence[] {
  if (!text || text.trim() === '') return [];
  const sentences = splitSentences(text);
  const occurrences: HighlightOccurrence[] = [];
  let currentSearchIndex = 0;

  sentences.forEach((sentence) => {
    // Find sentence in text starting from currentSearchIndex to handle duplicate sentences correctly
    const startIdx = text.toLowerCase().indexOf(sentence.toLowerCase(), currentSearchIndex);
    if (startIdx !== -1) {
      const endIdx = startIdx + sentence.length;
      currentSearchIndex = endIdx; // advance search cursor

      const words = sentence.match(/[a-zA-Z0-9']+/g) || [];
      if (words.length >= 30) {
        occurrences.push({
          text: sentence,
          type: 'long-sentence',
          startIndex: startIdx,
          endIndex: endIdx,
        });
      }

      // Check for passive voice
      PASSIVE_VOICE_REGEX.lastIndex = 0;
      let match;
      while ((match = PASSIVE_VOICE_REGEX.exec(sentence)) !== null) {
        const matchText = match[0];
        const matchStart = startIdx + match.index;
        const matchEnd = matchStart + matchText.length;
        occurrences.push({
          text: matchText,
          type: 'passive',
          startIndex: matchStart,
          endIndex: matchEnd,
        });
      }
    }
  });

  return occurrences;
}

export function generateSuggestions(
  text: string,
  stats: TextStatistics,
  patterns: PatternAnalysis
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  let idCounter = 1;

  const nextId = () => `sug-${idCounter++}`;

  if (!text || text.trim() === '') return [];

  // 1. Long Sentence Suggestion
  const sentencesText = splitSentences(text);

  const longSentences: string[] = [];
  const longSentenceFixes: Record<string, string> = {};

  sentencesText.forEach((s: string) => {
    const words = s.match(/[a-zA-Z0-9']+/g) || [];
    if (words.length >= 30) {
      longSentences.push(s);
      
      // Attempt Conjunction Slicing with compromise
      const doc = nlp(s);
      const conjunctions = doc.match('#Conjunction').out('array');
      const validConjunctions = conjunctions.filter((c: string) => ['and', 'but', 'so', 'because'].includes(c.toLowerCase()));
      
      if (validConjunctions.length > 0) {
        const conj = validConjunctions[0];
        const splitIndex = s.toLowerCase().indexOf(' ' + conj.toLowerCase() + ' ');
        if (splitIndex > 0) {
          const part1 = s.substring(0, splitIndex).trim();
          let part2 = s.substring(splitIndex + conj.length + 2).trim();
          if (part2.length > 0) {
            part2 = part2.charAt(0).toUpperCase() + part2.slice(1);
            longSentenceFixes[s] = `${part1}. ${part2}`;
          }
        }
      }
    }
  });

  if (longSentences.length > 0) {
    const bestFix = longSentenceFixes[longSentences[0]] 
      ? `For example, try splitting at the conjunction: "${longSentenceFixes[longSentences[0]]}"` 
      : 'Try dividing these long sentences into two or more shorter ones using periods or semicolons.';

    suggestions.push({
      id: nextId(),
      category: 'sentence',
      severity: longSentences.length > 3 ? 'critical' : 'warning',
      title: 'Break Down Long Sentences',
      explanation: `You have ${longSentences.length} sentence(s) that are 30+ words long. Readers find long sentences difficult to digest.`,
      suggestedFix: bestFix,
      occurrences: longSentences.slice(0, 5), // Show up to 5 examples
    });
  }

  // 2. Passive Voice Suggestion
  const passiveVoiceMatches: string[] = [];
  const passiveFixes: string[] = [];

  sentencesText.forEach((s: string) => {
    PASSIVE_VOICE_REGEX.lastIndex = 0;
    const m = PASSIVE_VOICE_REGEX.exec(s);
    if (m !== null) {
      const fragment = m[0].toLowerCase().trim();
      passiveVoiceMatches.push(fragment);

      // Attempt to extract Agent, Verb, Target using compromise
      const doc = nlp(s);
      const passiveMatch = doc.match('(#Noun|#Pronoun|#Determiner)+ (is|was|were|are|be|been|being) #Participle by (#Noun|#Pronoun|#Determiner)+');
      
      if (passiveMatch.found) {
        const target = passiveMatch.match('^(#Noun|#Pronoun|#Determiner)+').text();
        const verb = (passiveMatch.match('#Participle') as unknown as { verbs(): { toPastTense(): { text(): string } } }).verbs().toPastTense().text();
        const agent = passiveMatch.match('by (#Noun|#Pronoun|#Determiner)+').not('by').text();
        
        if (target && verb && agent) {
          const capitalizedAgent = agent.charAt(0).toUpperCase() + agent.slice(1);
          passiveFixes.push(`${capitalizedAgent} ${verb} ${target}.`);
        }
      }
    }
  });

  if (passiveVoiceMatches.length > 0) {
    const uniquePassives = Array.from(new Set(passiveVoiceMatches));
    const suggestedFix = passiveFixes.length > 0 
      ? `Rephrase to make the subject perform the action. For example: "${passiveFixes[0]}"`
      : 'Rephrase to make the subject perform the action. Instead of "The book was read by the student," use "The student read the book."';

    suggestions.push({
      id: nextId(),
      category: 'style',
      severity: 'warning',
      title: 'Reduce Passive Voice',
      explanation: `Detected passive voice structures (e.g., "${uniquePassives.slice(0, 3).join('", "')}"). Passive voice makes writing feel indirect and wordy.`,
      suggestedFix: suggestedFix,
      occurrences: uniquePassives.slice(0, 5),
    });
  }

  // 2.5 Wordiness Reducer (Dictionary Mapping)
  const WORDINESS_DICT: Record<string, string> = {
    'in order to': 'to',
    'due to the fact that': 'because',
    'at this point in time': 'now',
    'a large number of': 'many',
    'for the purpose of': 'to',
    'in the event that': 'if',
    'with the exception of': 'except',
    'despite the fact that': 'although',
    'make a decision': 'decide',
    'take into consideration': 'consider'
  };

  const bloatedMatches: Array<{ phrase: string; fix: string }> = [];
  const textLower = text.toLowerCase();
  
  Object.entries(WORDINESS_DICT).forEach(([bloated, concise]) => {
    if (textLower.includes(bloated)) {
      bloatedMatches.push({ phrase: bloated, fix: concise });
    }
  });

  if (bloatedMatches.length > 0) {
    suggestions.push({
      id: nextId(),
      category: 'style',
      severity: 'info',
      title: 'Reduce Bloated Phrasing',
      explanation: `Detected wordy phrases that can be simplified for better readability.`,
      suggestedFix: 'Replace complex phrases with direct alternatives: ' + bloatedMatches.slice(0, 3).map(m => '"' + m.phrase + '" -> "' + m.fix + '"').join(', ') + '.',
      occurrences: bloatedMatches.map(m => '"' + m.phrase + '" (suggested swap: "' + m.fix + '")'),
    });
  }

  // 3. Excessive Repetition (Phrases)
  const repetitivePhrases = [
    ...patterns.repeatedPhrases3Gram.slice(0, 3),
    ...patterns.repeatedPhrases4Gram.slice(0, 2),
  ].filter((p) => p.count >= 3);

  if (repetitivePhrases.length > 0) {
    suggestions.push({
      id: nextId(),
      category: 'repetition',
      severity: 'critical',
      title: 'Rewrite Repetitive Phrases',
      explanation: `Certain multi-word phrases appear frequently, such as: ${repetitivePhrases
        .map((p) => `"${p.phrase}" (${p.count}x)`)
        .join(', ')}. This makes your text feel redundant.`,
      suggestedFix: 'Use synonyms, vary the sentence structures, or combine sentences to eliminate repeated wording.',
      occurrences: repetitivePhrases.map((p) => `Phrase: "${p.phrase}" (used ${p.count} times)`),
    });
  }

  // 4. Repeated Sentence Openings
  const criticalOpenings = patterns.repeatedOpenings.filter((op) => op.count >= 3);
  if (criticalOpenings.length > 0) {
    suggestions.push({
      id: nextId(),
      category: 'repetition',
      severity: 'warning',
      title: 'Vary Sentence Openings',
      explanation: `Multiple sentences start with the same sequence, such as "${criticalOpenings
        .slice(0, 3)
        .map((o) => o.opening)
        .join('", "')}". This creates a repetitive reading rhythm.`,
      suggestedFix: 'Reorder clauses or insert transition words to begin sentences differently.',
      occurrences: criticalOpenings.slice(0, 3).map((o) => `"${o.opening}" (used ${o.count} times)`),
    });
  }

  // 5. Rhythm & Variation Suggestions
  if (patterns.monotonousRhythmFlag || patterns.uniformSentenceLengthsFlag) {
    suggestions.push({
      id: nextId(),
      category: 'rhythm',
      severity: 'warning',
      title: 'Monotonous Sentence Rhythms',
      explanation: 'Your sentences have highly uniform lengths. This creates a robotic or repetitive rhythm, often referred to as low burstiness.',
      suggestedFix: 'Mix short punchy sentences (5-10 words) with medium sentences (15-20 words) and longer explanatory sentences (25+ words) to build a melodic rhythm.',
      occurrences: [`Average sentence length: ${stats.avgSentenceLength.toFixed(1)} words`, `Standard deviation (Burstiness): ${stats.stdDevSentenceLength.toFixed(1)} words`],
    });
  }

  // 6. Overly Long Paragraphs
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const longParagraphs: string[] = [];
  paragraphs.forEach((p) => {
    const words = p.match(/[a-zA-Z0-9']+/g) || [];
    if (words.length > 150) {
      longParagraphs.push(p.slice(0, 100) + '...');
    }
  });

  if (longParagraphs.length > 0) {
    suggestions.push({
      id: nextId(),
      category: 'paragraph',
      severity: 'warning',
      title: 'Break Up Long Paragraphs',
      explanation: `You have ${longParagraphs.length} paragraph(s) containing more than 150 words. Long blocks of text can discourage readers on digital screens.`,
      suggestedFix: 'Split these paragraphs at logical transition points or thematic shifts to create white space and improve scanning.',
      occurrences: longParagraphs.slice(0, 3),
    });
  }

  // 7. Missing Transition Words (Low Lexical Flow)
  if (stats.wordCount > 100 && patterns.transitionWordDensity < 0.015) {
    suggestions.push({
      id: nextId(),
      category: 'style',
      severity: 'info',
      title: 'Add Transition Words',
      explanation: `Transition words make up only ${(patterns.transitionWordDensity * 100).toFixed(1)}% of your text. Readers need transitions to follow arguments smoothly.`,
      suggestedFix: 'Incorporate logical signposts such as "however", "therefore", "in addition", "consequently", or "meanwhile" to connect your sentences.',
      occurrences: [`Current Transition Density: ${(patterns.transitionWordDensity * 100).toFixed(1)}% (Target: >1.5%)`],
    });
  }

  // Sort suggestions by severity: critical -> warning -> info
  const severityOrder = { critical: 1, warning: 2, info: 3 };
  return suggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
