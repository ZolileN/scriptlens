import nlp from 'compromise';
import { splitSentences, TextStatistics } from './statistics';
import { PatternAnalysis } from './patterns';

export interface Suggestion {
  id: string;
  category: 'sentence' | 'repetition' | 'style' | 'paragraph' | 'rhythm' | 'spelling' | 'grammar' | 'compliance';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  explanation: string;
  suggestedFix: string;
  occurrences: string[];
  occurrenceRanges?: Array<{ startIndex: number; endIndex: number; text: string }>;
}

// Regex for common passive voice structures in English
export const PASSIVE_VOICE_REGEX = /\b(am|is|are|was|were|be|been|being)\b\s+(\w+ed|written|taken|seen|done|known|built|chosen|given|shown|told|held|brought|kept|begun|broken|driven|eaten|fallen|forgotten|frozen|grown|hurt|lost|made|paid|run|sent|spoken|spent|understood|won)\b/gi;

export interface HighlightOccurrence {
  text: string;
  type: 'passive' | 'long-sentence' | 'critical' | 'style' | 'compliance' | 'tone';
  startIndex: number;
  endIndex: number;
}

interface WinkToken {
  out: (prop?: unknown) => string;
  _index?: number;
}

interface WinkEntity {
  out: (prop?: unknown) => string;
  tokens: () => {
    itemAt: (idx: number) => WinkToken | undefined;
    length: () => number;
  };
}

interface WinkSentence {
  out: (prop?: unknown) => unknown;
}

interface VFileMsg {
  source: string;
  reason: string;
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
}

// Relational glue words for weak phrasing checks
const GLUE_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'in', 'of',
  'to', 'by', 'with', 'from', 'as', 'into', 'about', 'is', 'was', 'were', 'been',
  'be', 'are', 'am', 'it', 'its', 'they', 'them', 'their', 'he', 'him', 'his',
  'she', 'her', 'hers', 'you', 'your', 'i', 'me', 'my', 'we', 'us', 'our', 'this',
  'that', 'these', 'those', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would',
  'should', 'could', 'can', 'may', 'might', 'must', 'so', 'then', 'there', 'here',
  'than', 'if', 'when', 'where', 'why', 'how', 'who', 'what', 'which', 'up', 'out',
  'over', 'after', 'before', 'off', 'down', 'through', 'between', 'under'
]);

const HARPER_CUSTOM_DICTIONARY = [
  // South African geographical names / provinces
  'Gauteng', 'KwaZulu', 'Natal', 'Mpumalanga', 'Limpopo', 'Tshwane', 'Soweto',
  'Polokwane', 'Mbombela', 'Mangaung', 'Johannesburg', 'Pretoria', 'Durban', 
  'Gqeberha', 'Khayelitsha', 'Centurion', 'Midrand', 'Sandton', 'Boksburg', 
  'Benoni', 'Kempton', 'Roodepoort', 'Randburg', 'Stellenbosch', 'Paarl', 
  'George', 'Welkom', 'Sasolburg', 'Upington', 'Kimberley', 'Mmabatho', 
  'Mahikeng', 'Rustenburg', 'Potchefstroom', 'Klerksdorp', 'Vereeniging', 
  'Vanderbijlpark', 'Sasolburg', 'Secunda', 'Witbank', 'eMalahleni', 
  'Middelburg', 'Nelspruit', 'Pietermaritzburg', 'Pinetown', 'Chatsworth', 
  'Phoenix', 'Umlazi', 'Mitchells', 'Plain', 'Athlone', 'Guguletu', 'Langa', 
  'Nyanga', 'Katlehong', 'Tembisa', 'Vosloorus', 'Daveyton', 'Soshanguve', 
  'Mamelodi', 'Mabopane', 'Ga-Rankuwa', 'Hammanskraal', 'Temba',
  
  // Currencies / Financial
  'ZAR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'HKD', 'NZD',
  'SEK', 'KRW', 'SGD', 'NOK', 'MXN', 'INR', 'RUB', 'BRL', 'TRY', 'TWD',
  
  // Acronyms / Organizations / Frameworks
  'SDG', 'SDGs', 'NGO', 'NGOs', 'ICASA', 'SABC', 'SARS', 'NQF', 'SETA', 'Seta', 
  'SETAs', 'Setas', 'QA', 'UAT', 'SaaS', 'PaaS', 'IaaS', 'API', 'APIs', 'JSON', 
  'XML', 'HTML', 'CSS', 'DOM', 'SQL', 'NoSQL', 'Wasm', 'WebGPU', 'LLM', 'LLMs', 
  'AI', 'NLP', 'NER', 'ML', 'GPU', 'CPU', 'TPU', 'RAM', 'ROM', 'SDK', 'SDKs', 
  'IDE', 'IDEs', 'Git', 'GitHub', 'GitLab', 'CI', 'CD', 'UI', 'UX', 'MVP', 
  'PRD', 'RFC', 'KPI', 'KPIs', 'OKRs', 'OKR', 'ROI', 'B2B', 'B2C', 'SEO', 
  'SA', 'StatsSA', 'Stats', 'UNESCO', 'UNICEF', 'WHO', 'UN', 'UNDP',
  
  // General vocabulary / Valid compound words / Jargon
  'employability', 'entrepreneurship', 'upskilling', 'reskilling', 'multilingual', 
  'digitalisation', 'digitalization', 'decarbonisation', 'decarbonization', 
  'operationalise', 'operationalize', 'marketisation', 'marketization', 
  'financialisation', 'financialization', 'globalisation', 'globalization', 
  'localise', 'localize', 'customise', 'customize', 'optimise', 'optimize', 
  'maximise', 'maximize', 'minimise', 'minimize', 'prioritise', 'prioritize', 
  'synergise', 'synergize', 'harmonise', 'harmonize', 'rationalise', 'rationalize', 
  'systematise', 'systematize', 'normalise', 'normalize', 'standardise', 'standardize', 
  'formalise', 'formalize', 'mobilise', 'mobilize', 'democratise', 'democratize', 
  'modernise', 'modernize', 'decentralise', 'decentralize', 'centralise', 'centralize', 
  'sub-Saharan', 'non-governmental', 'socio-economic', 'under-resourced', 
  'high-unemployment', 'project-based', 'industry-aligned', 'work-readiness', 
  'face-to-face', 'peer-to-peer', 'state-of-the-art', 'co-creation', 'co-design', 
  'co-working', 'workspace'
];

const customDictSet = new Set(HARPER_CUSTOM_DICTIONARY.map(w => w.toLowerCase()));

function isAcronymOrProperNounHeuristic(word: string): boolean {
  const cleaned = word.trim().replace(/^['"]|['"]$/g, '');
  if (!cleaned) return true;

  // 1. Acronyms (e.g. ZAR, SDGs, UN, NGO, NGO's)
  if (/^[A-Z]{2,}[sS]?$/.test(cleaned) || /^[A-Z]{2,}'[sS]$/.test(cleaned)) {
    return true;
  }

  // 2. Contains numbers or special chars (e.g. 2030, SDGs4)
  if (/\d/.test(cleaned)) {
    return true;
  }

  // 3. Mixed case / PascalCase / camelCase (e.g. WebGPU, KwaZulu, JavaScript, TypeScript, openSpeech)
  if (cleaned.length > 1) {
    const afterFirst = cleaned.slice(1);
    if (/[A-Z]/.test(afterFirst) && /[a-z]/.test(cleaned)) {
      return true;
    }
  }

  return false;
}

function shouldIgnoreSpelling(problemText: string): boolean {
  const words = problemText.split(/[^a-zA-Z0-9']+/).filter(Boolean);
  if (words.length === 0) return true;
  return words.some(w => {
    const lower = w.toLowerCase();
    if (customDictSet.has(lower)) return true;
    return isAcronymOrProperNounHeuristic(w);
  });
}

function overlaps(start1: number, end1: number, start2: number, end2: number): boolean {
  return Math.max(start1, start2) < Math.min(end1, end2);
}

export function detectHighlights(text: string): HighlightOccurrence[] {
  if (!text || text.trim() === '') return [];
  const sentences = splitSentences(text);
  const occurrences: HighlightOccurrence[] = [];
  let currentSearchIndex = 0;

  sentences.forEach((sentence) => {
    const startIdx = text.toLowerCase().indexOf(sentence.toLowerCase(), currentSearchIndex);
    if (startIdx !== -1) {
      const endIdx = startIdx + sentence.length;
      currentSearchIndex = endIdx;

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

export function getHighlightsFromSuggestions(suggestions: Suggestion[], text: string): HighlightOccurrence[] {
  const occurrences: HighlightOccurrence[] = [];
  
  // Get base static highlights
  const staticHighlights = detectHighlights(text);
  occurrences.push(...staticHighlights);

  // Merge in occurrences from the suggestions list (spelling, compliance, jargon, etc.)
  suggestions.forEach((sug) => {
    if (sug.occurrenceRanges) {
      sug.occurrenceRanges.forEach((range) => {
        let type: HighlightOccurrence['type'] = 'style';
        if (sug.category === 'spelling' || sug.category === 'grammar') {
          type = 'critical';
        } else if (sug.category === 'compliance') {
          type = 'compliance';
        } else if (sug.category === 'style') {
          type = 'style';
        } else if (sug.category === 'rhythm') {
          type = 'tone';
        }

        const isDuplicate = occurrences.some(
          (occ) => occ.startIndex === range.startIndex && occ.endIndex === range.endIndex
        );
        if (!isDuplicate) {
          occurrences.push({
            text: range.text,
            type,
            startIndex: range.startIndex,
            endIndex: range.endIndex,
          });
        }
      });
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

  const sentencesText = splitSentences(text);

  // 1. Long Sentence Suggestion
  const longSentences: string[] = [];
  const longSentenceFixes: Record<string, string> = {};

  sentencesText.forEach((s: string) => {
    const words = s.match(/[a-zA-Z0-9']+/g) || [];
    if (words.length >= 30) {
      longSentences.push(s);
      
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
      occurrences: longSentences.slice(0, 5),
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

      const doc = nlp(s);
      const passiveMatch = doc.match('(#Noun|#Pronoun|#Determiner)+ (is|was|were|are|be|been|being) #Participle by (#Noun|#Pronoun|#Determiner)+');
      
      if (passiveMatch.found) {
        const target = passiveMatch.match('^(#Noun|#Pronoun|#Determiner)+').text();
        const verb = (passiveMatch.match('#Participle') as unknown as { verbs: () => { toPastTense: () => { text: () => string } } }).verbs().toPastTense().text();
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

  // Sticky Sentence Warning
  const stickySentences: string[] = [];
  const stickyRanges: Array<{ startIndex: number; endIndex: number; text: string }> = [];
  let currentStickySearchIndex = 0;
  sentencesText.forEach((s) => {
    const startIdx = text.toLowerCase().indexOf(s.toLowerCase(), currentStickySearchIndex);
    if (startIdx !== -1) {
      const endIdx = startIdx + s.length;
      currentStickySearchIndex = endIdx;
      
      const words = s.match(/[a-zA-Z0-9']+/g) || [];
      if (words.length >= 8) {
        let glueCount = 0;
        words.forEach((w) => {
          if (GLUE_WORDS.has(w.toLowerCase())) {
            glueCount++;
          }
        });
        if (glueCount / words.length > 0.60) {
          stickySentences.push(s);
          stickyRanges.push({ startIndex: startIdx, endIndex: endIdx, text: s });
        }
      }
    }
  });

  if (stickySentences.length > 0) {
    suggestions.push({
      id: nextId(),
      category: 'style',
      severity: 'warning',
      title: 'Reduce Sticky Sentences',
      explanation: `You have ${stickySentences.length} sentence(s) that are highly "sticky" (containing >60% glue words like "and", "but", "the", "on", "to"). Glue words hold sentences together but add no semantic meaning.`,
      suggestedFix: 'Rephrase to use more content-carrying words (nouns, verbs, adjectives) and remove unnecessary structural filler.',
      occurrences: stickySentences.slice(0, 5),
      occurrenceRanges: stickyRanges.slice(0, 5)
    });
  }

  // Monotony Rhythm Warning
  const sentenceLengths = sentencesText.map((s: string) => {
    const words = s.match(/[a-zA-Z0-9']+/g) || [];
    return words.length;
  });

  const monotonousInstances: string[] = [];
  const monotonyRanges: Array<{ startIndex: number; endIndex: number; text: string }> = [];
  let monotonySearchIdx = 0;
  for (let i = 0; i <= sentenceLengths.length - 4; i++) {
    const l1 = sentenceLengths[i];
    const l2 = sentenceLengths[i+1];
    const l3 = sentenceLengths[i+2];
    const l4 = sentenceLengths[i+3];
    if (l1 > 0 && l1 === l2 && l1 === l3 && l1 === l4) {
      const displayStr = `Sentences ${i+1}-${i+4} (each has ${l1} words)`;
      monotonousInstances.push(displayStr);
      
      const firstSent = sentencesText[i];
      const startIdx = text.toLowerCase().indexOf(firstSent.toLowerCase(), monotonySearchIdx);
      if (startIdx !== -1) {
        let endIdx = startIdx + firstSent.length;
        for (let j = 1; j < 4; j++) {
          const nextS = sentencesText[i+j];
          const nextStart = text.toLowerCase().indexOf(nextS.toLowerCase(), endIdx);
          if (nextStart !== -1) {
            endIdx = nextStart + nextS.length;
          }
        }
        monotonyRanges.push({
          startIndex: startIdx,
          endIndex: endIdx,
          text: text.substring(startIdx, endIdx)
        });
        monotonySearchIdx = startIdx + firstSent.length;
      }
    }
  }

  if (monotonousInstances.length > 0) {
    suggestions.push({
      id: nextId(),
      category: 'rhythm',
      severity: 'warning',
      title: 'Monotonous Rhythm Alert',
      explanation: `Found ${monotonousInstances.length} group(s) of 4 consecutive sentences with identical word counts. Writing with the same sentence length repeatedly feels repetitive and boring.`,
      suggestedFix: 'Vary your sentence structures. Combine a couple of sentences, or break one down into a short, punchy sentence to create a more engaging rhythm.',
      occurrences: monotonousInstances.slice(0, 3),
      occurrenceRanges: monotonyRanges.slice(0, 3)
    });
  }

  // Flesch-Kincaid Grade Level Alert
  if (stats.fleschKincaidGrade > 12) {
    suggestions.push({
      id: nextId(),
      category: 'rhythm',
      severity: 'info',
      title: 'High Reading Grade Level',
      explanation: `Your Flesch-Kincaid Grade Level is Grade ${stats.fleschKincaidGrade.toFixed(1)} (College level/Difficult). This may restrict the accessibility of your writing for general readers.`,
      suggestedFix: 'Simplify complex words, shorten your sentences, and use direct phrasing to lower the grade level.',
      occurrences: [`Flesch-Kincaid Grade: ${stats.fleschKincaidGrade.toFixed(1)}`],
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

  // 5. Rhythm & Variation Suggestions (General)
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

  const severityOrder = { critical: 1, warning: 2, info: 3 };
  return suggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export async function generateSuggestionsAsync(
  text: string,
  stats: TextStatistics,
  patterns: PatternAnalysis
): Promise<{ suggestions: Suggestion[]; tone?: { positivePercent: number; negativePercent: number; neutralPercent: number } }> {
  // 1. Get synchronous suggestions
  const suggestions = generateSuggestions(text, stats, patterns);
  let idCounter = suggestions.length + 100;
  const nextId = () => `sug-async-${idCounter++}`;
  
  if (!text || text.trim() === '') {
    return { suggestions };
  }

  let finalTone: { positivePercent: number; negativePercent: number; neutralPercent: number } | undefined = undefined;
  const entitiesList: Array<{ text: string; category: string; startIndex: number; endIndex: number }> = [];

  // 1. Run Wink-NLP named entity (NER) detection & tone calculations first
  try {
    const [winkNLPModule, modelModule] = await Promise.all([
      import('wink-nlp'),
      import('wink-eng-lite-web-model')
    ]);
    const winkNLP = winkNLPModule.default || winkNLPModule;
    const model = modelModule.default || modelModule;
    const nlpInstance = winkNLP(model);
    const its = nlpInstance.its;

    const doc = nlpInstance.readDoc(text);

    // Label tokens
    let tIdx = 0;
    doc.tokens().each((t: WinkToken) => {
      t._index = tIdx++;
    });

    // Compute token offsets
    let curIndex = 0;
    const tokenOffsets: Array<{ start: number; end: number }> = [];
    doc.tokens().each((t: WinkToken) => {
      const tVal = t.out();
      curIndex += t.out(its.precedingSpaces).length;
      const start = curIndex;
      const end = start + tVal.length;
      tokenOffsets.push({ start, end });
      curIndex = end;
    });

    // Extract entities
    doc.entities().each((ent: WinkEntity) => {
      const entText = ent.out();
      const entType = ent.out(its.type);
      const entTokens = ent.tokens();
      const firstT = entTokens.itemAt(0);
      const lastT = entTokens.itemAt(entTokens.length() - 1);
      
      const firstIdx = firstT?._index;
      const lastIdx = lastT?._index;
      
      if (firstIdx !== undefined && lastIdx !== undefined && tokenOffsets[firstIdx] && tokenOffsets[lastIdx]) {
        entitiesList.push({
          text: entText,
          category: entType,
          startIndex: tokenOffsets[firstIdx].start,
          endIndex: tokenOffsets[lastIdx].end
        });
      }
    });

    const sensitiveTypes = new Set(['PERSON', 'ORGANIZATION', 'LOCATION', 'EMAIL', 'CARD_NUMBER', 'PHONE_NUMBER']);
    const sensitiveEntities = entitiesList.filter(e => sensitiveTypes.has(e.category));

    if (sensitiveEntities.length > 0) {
      suggestions.push({
        id: nextId(),
        category: 'compliance',
        severity: 'warning',
        title: 'Sensitive Personal Data (NER) Warnings',
        explanation: `Detected ${sensitiveEntities.length} named entity/entities (e.g. Names, Companies, or Contact details) which might compromise confidentiality or privacy.`,
        suggestedFix: 'Toggle "Redact Document" in the editor dashboard to anonymize these entities automatically.',
        occurrences: sensitiveEntities.slice(0, 10).map(e => `${e.category}: "${e.text}"`),
        occurrenceRanges: sensitiveEntities.slice(0, 10).map(e => ({
          startIndex: e.startIndex,
          endIndex: e.endIndex,
          text: e.text
        }))
      });
    }

    // Tone calculation via sentence sentiment
    let positiveSentences = 0;
    let negativeSentences = 0;
    let neutralSentences = 0;

    doc.sentences().each((s: WinkSentence) => {
      const score = s.out(its.sentiment) as number;
      if (score > 0.05) {
        positiveSentences++;
      } else if (score < -0.05) {
        negativeSentences++;
      } else {
        neutralSentences++;
      }
    });

    const totalSentences = positiveSentences + negativeSentences + neutralSentences || 1;
    finalTone = {
      positivePercent: Math.round((positiveSentences / totalSentences) * 100),
      negativePercent: Math.round((negativeSentences / totalSentences) * 100),
      neutralPercent: Math.round((neutralSentences / totalSentences) * 100)
    };

  } catch (err) {
    console.error('Error running Wink-NLP engine:', err);
  }

  // 2. Run Harper.js grammar and spelling checker
  try {
    const [harperModule, binaryModule] = await Promise.all([
      import('harper.js'),
      import('harper.js/binaryInlined')
    ]);
    const linter = new harperModule.LocalLinter({
      binary: binaryModule.binaryInlined,
      dialect: harperModule.Dialect.American
    });

    // Layer 1: Pre-seed dictionary with custom words
    await linter.importWords(HARPER_CUSTOM_DICTIONARY);

    const lints = await linter.lint(text);

    const spellingLints = lints.filter(l => l.lint_kind() === 'Spelling');
    const grammarLints = lints.filter(l => l.lint_kind() !== 'Spelling');

    // Filter out spelling lints that match heuristics or overlap with NER entities
    const filteredSpellingLints = spellingLints.filter(l => {
      const problem = l.get_problem_text();
      // Heuristics/Custom dictionary check
      if (shouldIgnoreSpelling(problem)) {
        return false;
      }
      // Overlap with NER entities check
      const start = l.span().start;
      const end = l.span().end;
      const overlapsEntity = entitiesList.some(ent => overlaps(start, end, ent.startIndex, ent.endIndex));
      if (overlapsEntity) {
        return false;
      }
      return true;
    });

    if (filteredSpellingLints.length > 0) {
      const occurrences: string[] = [];
      const ranges: Array<{ startIndex: number; endIndex: number; text: string }> = [];
      filteredSpellingLints.forEach(l => {
        const problem = l.get_problem_text();
        const suggestionsList = l.suggestions();
        const rep = suggestionsList.length > 0 ? suggestionsList[0].get_replacement_text() : '';
        occurrences.push(`"${problem}"` + (rep ? ` (suggested: "${rep}")` : ''));
        ranges.push({ startIndex: l.span().start, endIndex: l.span().end, text: problem });
      });

      suggestions.push({
        id: nextId(),
        category: 'spelling',
        severity: 'warning',
        title: 'Spelling Typos',
        explanation: `Detected ${filteredSpellingLints.length} misspelled word(s) in your text.`,
        suggestedFix: 'Review spelling list and correct these typos.',
        occurrences: occurrences.slice(0, 10),
        occurrenceRanges: ranges
      });
    }

    if (grammarLints.length > 0) {
      grammarLints.forEach(l => {
        const problem = l.get_problem_text();
        const suggestionsList = l.suggestions();
        const rep = suggestionsList.length > 0 ? suggestionsList[0].get_replacement_text() : '';
        const suggestedFix = rep ? `Replace with: "${rep}"` : l.message();
        
        suggestions.push({
          id: nextId(),
          category: 'grammar',
          severity: 'warning',
          title: l.lint_kind_pretty() || 'Grammar Issue',
          explanation: l.message(),
          suggestedFix: suggestedFix,
          occurrences: [problem],
          occurrenceRanges: [{ startIndex: l.span().start, endIndex: l.span().end, text: problem }]
        });
      });
    }
  } catch (err) {
    console.error('Error running Harper.js linter:', err);
  }

  // 3. Run Retext stylistic checkers
  try {
    const [
      { unified },
      retextEnglish,
      retextSimplify,
      retextEquality,
      retextCliches,
      retextStringify
    ] = await Promise.all([
      import('unified'),
      import('retext-english'),
      import('retext-simplify'),
      import('retext-equality'),
      import('retext-cliches'),
      import('retext-stringify')
    ]);

    const file = await unified()
      .use(retextEnglish.default || retextEnglish)
      .use(retextSimplify.default || retextSimplify)
      .use(retextEquality.default || retextEquality)
      .use(retextCliches.default || retextCliches)
      .use(retextStringify.default || retextStringify)
      .process(text);

    const simplifyMsgs: VFileMsg[] = [];
    const equalityMsgs: VFileMsg[] = [];
    const clichesMsgs: VFileMsg[] = [];

    (file.messages as unknown as VFileMsg[]).forEach((msg) => {
      if (msg.source === 'retext-simplify') {
        simplifyMsgs.push(msg);
      } else if (msg.source === 'retext-equality') {
        equalityMsgs.push(msg);
      } else if (msg.source === 'retext-cliche' || msg.source === 'retext-cliches') {
        clichesMsgs.push(msg);
      }
    });

    if (simplifyMsgs.length > 0) {
      const occurrences: string[] = [];
      const ranges: Array<{ startIndex: number; endIndex: number; text: string }> = [];
      simplifyMsgs.forEach(msg => {
        const start = msg.position?.start?.offset;
        const end = msg.position?.end?.offset;
        if (start !== undefined && end !== undefined) {
          const matchText = text.substring(start, end);
          occurrences.push(`"${matchText}": ${msg.reason}`);
          ranges.push({ startIndex: start, endIndex: end, text: matchText });
        }
      });

      suggestions.push({
        id: nextId(),
        category: 'style',
        severity: 'warning',
        title: 'Simplify Corporate Jargon & Buzzwords',
        explanation: `Detected ${simplifyMsgs.length} complex word(s) or bloated jargon that could be phrased more simply.`,
        suggestedFix: 'Try using simpler, more direct vocabulary to make your text clearer for general audiences.',
        occurrences: occurrences.slice(0, 8),
        occurrenceRanges: ranges
      });
    }

    if (equalityMsgs.length > 0) {
      const occurrences: string[] = [];
      const ranges: Array<{ startIndex: number; endIndex: number; text: string }> = [];
      equalityMsgs.forEach(msg => {
        const start = msg.position?.start?.offset;
        const end = msg.position?.end?.offset;
        if (start !== undefined && end !== undefined) {
          const matchText = text.substring(start, end);
          occurrences.push(`"${matchText}": ${msg.reason}`);
          ranges.push({ startIndex: start, endIndex: end, text: matchText });
        }
      });

      suggestions.push({
        id: nextId(),
        category: 'style',
        severity: 'warning',
        title: 'Inclusive Language / Gender Bias Warnings',
        explanation: `Detected ${equalityMsgs.length} phrasing issue(s) that might be non-inclusive, biased, or exclusive.`,
        suggestedFix: 'Replace gendered or exclusive terms with neutral, inclusive alternatives (e.g. "policemaker" instead of "congressman").',
        occurrences: occurrences.slice(0, 8),
        occurrenceRanges: ranges
      });
    }

    if (clichesMsgs.length > 0) {
      const occurrences: string[] = [];
      const ranges: Array<{ startIndex: number; endIndex: number; text: string }> = [];
      clichesMsgs.forEach(msg => {
        const start = msg.position?.start?.offset;
        const end = msg.position?.end?.offset;
        if (start !== undefined && end !== undefined) {
          const matchText = text.substring(start, end);
          occurrences.push(`"${matchText}": ${msg.reason}`);
          ranges.push({ startIndex: start, endIndex: end, text: matchText });
        }
      });

      suggestions.push({
        id: nextId(),
        category: 'style',
        severity: 'info',
        title: 'Avoid Tired Clichés',
        explanation: `Detected ${clichesMsgs.length} cliché(s). Overusing clichés makes writing feel less original and persuasive.`,
        suggestedFix: 'Rephrase to use fresh, specific descriptions instead of stock phrases.',
        occurrences: occurrences.slice(0, 8),
        occurrenceRanges: ranges
      });
    }
  } catch (err) {
    console.error('Error running Retext stylistic checks:', err);
  }

  const severityOrder = { critical: 1, warning: 2, info: 3 };
  const sortedSuggestions = suggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    suggestions: sortedSuggestions,
    tone: finalTone
  };
}

export async function anonymizeText(text: string): Promise<string> {
  try {
    const [winkNLPModule, modelModule] = await Promise.all([
      import('wink-nlp'),
      import('wink-eng-lite-web-model')
    ]);
    const winkNLP = winkNLPModule.default || winkNLPModule;
    const model = modelModule.default || modelModule;
    const nlpInstance = winkNLP(model);
    const its = nlpInstance.its;

    const doc = nlpInstance.readDoc(text);

    let tIdx = 0;
    doc.tokens().each((t: WinkToken) => {
      t._index = tIdx++;
    });

    let curIndex = 0;
    const tokenOffsets: Array<{ start: number; end: number }> = [];
    doc.tokens().each((t: WinkToken) => {
      const tVal = t.out();
      curIndex += t.out(its.precedingSpaces).length;
      const start = curIndex;
      const end = start + tVal.length;
      tokenOffsets.push({ start, end });
      curIndex = end;
    });

    const entitiesList: Array<{ text: string; category: string; startIndex: number; endIndex: number }> = [];
    doc.entities().each((ent: WinkEntity) => {
      const entText = ent.out();
      const entType = ent.out(its.type);
      const entTokens = ent.tokens();
      const firstT = entTokens.itemAt(0);
      const lastT = entTokens.itemAt(entTokens.length() - 1);
      
      const firstIdx = firstT?._index;
      const lastIdx = lastT?._index;
      
      if (firstIdx !== undefined && lastIdx !== undefined && tokenOffsets[firstIdx] && tokenOffsets[lastIdx]) {
        entitiesList.push({
          text: entText,
          category: entType,
          startIndex: tokenOffsets[firstIdx].start,
          endIndex: tokenOffsets[lastIdx].end
        });
      }
    });

    const sensitiveTypes = new Set(['PERSON', 'ORGANIZATION', 'LOCATION', 'EMAIL', 'CARD_NUMBER', 'PHONE_NUMBER']);
    const sensitiveEntities = entitiesList.filter(e => sensitiveTypes.has(e.category));

    sensitiveEntities.sort((a, b) => b.startIndex - a.startIndex);

    let redactedText = text;
    const categoryCounters: Record<string, number> = {};
    const entityMap: Record<string, string> = {};

    sensitiveEntities.forEach((ent) => {
      const key = `${ent.category}:${ent.text.toLowerCase()}`;
      if (!entityMap[key]) {
        categoryCounters[ent.category] = (categoryCounters[ent.category] || 0) + 1;
        const count = categoryCounters[ent.category];
        
        let label = `[${ent.category}_${count}]`;
        if (ent.category === 'PERSON') {
          label = `[PERSON_${count}]`;
        } else if (ent.category === 'ORGANIZATION') {
          const letter = String.fromCharCode(64 + count);
          label = `[COMPANY_${letter}]`;
        } else if (ent.category === 'LOCATION') {
          label = `[LOCATION_${count}]`;
        } else if (ent.category === 'EMAIL') {
          label = `[EMAIL_${count}]`;
        } else if (ent.category === 'CARD_NUMBER') {
          label = `[CARD_${count}]`;
        } else if (ent.category === 'PHONE_NUMBER') {
          label = `[PHONE_${count}]`;
        }
        entityMap[key] = label;
      }

      const label = entityMap[key];
      redactedText = redactedText.substring(0, ent.startIndex) + label + redactedText.substring(ent.endIndex);
    });

    return redactedText;
  } catch (err) {
    console.error('Anonymize text failed:', err);
    return text;
  }
}
