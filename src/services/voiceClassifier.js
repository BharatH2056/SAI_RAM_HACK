/**
 * GoldenHour Multilingual Voice Emergency Classifier
 * Classifies speech transcripts into emergency types across English,
 * Hindi (Romanized & Devanagari), and Kannada (Romanized & Kannada Script).
 *
 * All classifications are suggestions with `needsHumanReview: true`
 * for dispatcher confirmation.
 */

// Categorized keyword dictionaries with match weights
const KEYWORD_DICTIONARY = {
  heart_attack: [
    // English
    { term: 'heart attack', weight: 3.0 },
    { term: 'cardiac arrest', weight: 3.0 },
    { term: 'chest pain', weight: 2.5 },
    { term: 'chest tightness', weight: 2.2 },
    { term: 'chest pressure', weight: 2.2 },
    { term: 'heart stopped', weight: 2.5 },
    { term: 'left arm pain', weight: 2.0 },
    { term: 'heart problem', weight: 1.8 },
    { term: 'angina', weight: 2.5 },
    // Hindi (Romanized & Devanagari)
    { term: 'seene mein dard', weight: 2.8 },
    { term: 'seene me dard', weight: 2.8 },
    { term: 'dil ka daura', weight: 3.0 },
    { term: 'dil mein dard', weight: 2.5 },
    { term: 'chhati mein dard', weight: 2.5 },
    { term: 'सीने में दर्द', weight: 2.8 },
    { term: 'दिल का दौरा', weight: 3.0 },
    { term: 'हार्ट अटैक', weight: 3.0 },
    // Kannada (Romanized & Script)
    { term: 'ede novu', weight: 2.8 },
    { term: 'edeyalli novu', weight: 2.8 },
    { term: 'hrudayaghata', weight: 3.0 },
    { term: 'hrudaya novu', weight: 2.8 },
    { term: 'ede bharavagide', weight: 2.2 },
    { term: 'ಎದೆ ನೋವು', weight: 2.8 },
    { term: 'ಎದೆಯಲ್ಲಿ ನೋವು', weight: 2.8 },
    { term: 'ಹೃದಯಾಘಾತ', weight: 3.0 },
  ],

  stroke: [
    // English
    { term: 'stroke', weight: 2.8 },
    { term: 'brain stroke', weight: 3.0 },
    { term: 'face is drooping', weight: 3.0 },
    { term: 'face drooping', weight: 3.0 },
    { term: 'facial drooping', weight: 3.0 },
    { term: "can't speak", weight: 2.5 },
    { term: 'cannot speak', weight: 2.5 },
    { term: 'slurred speech', weight: 2.5 },
    { term: 'paralysis', weight: 2.8 },
    { term: 'paralyzed', weight: 2.8 },
    { term: 'one side numb', weight: 2.5 },
    { term: 'one side weakness', weight: 2.5 },
    { term: 'arm numbness', weight: 2.0 },
    // Hindi (Romanized & Devanagari)
    { term: 'lakwa', weight: 2.8 },
    { term: 'falij', weight: 2.8 },
    { term: 'munh tedha', weight: 2.8 },
    { term: 'bol nahi pa rahe', weight: 2.5 },
    { term: 'ek taraf sunn', weight: 2.5 },
    { term: 'लकवा', weight: 2.8 },
    { term: 'फ़ालिज', weight: 2.8 },
    { term: 'मुंह टेढ़ा', weight: 2.8 },
    { term: 'बोल नहीं पा रहे', weight: 2.5 },
    // Kannada (Romanized & Script)
    { term: 'pakshaghata', weight: 3.0 },
    { term: 'lakva', weight: 2.8 },
    { term: 'matanadalu aguttilla', weight: 2.5 },
    { term: 'swadheena thappide', weight: 2.5 },
    { term: 'ಬಾಯಿ ಒಂದು ಕಡೆ', weight: 2.5 },
    { term: 'ಪಕ್ಷಘಾತ', weight: 3.0 },
    { term: 'ಲಕ್ವಾ', weight: 2.8 },
    { term: 'ಮಾತನಾಡಲು ಆಗುತ್ತಿಲ್ಲ', weight: 2.5 },
  ],

  trauma: [
    // English
    { term: 'accident', weight: 2.0 },
    { term: 'car accident', weight: 2.8 },
    { term: 'car crash', weight: 2.8 },
    { term: 'bike accident', weight: 2.8 },
    { term: 'road accident', weight: 2.8 },
    { term: 'bleeding heavily', weight: 2.5 },
    { term: 'heavy bleeding', weight: 2.5 },
    { term: 'bleeding', weight: 1.8 },
    { term: 'fracture', weight: 2.2 },
    { term: 'broken bone', weight: 2.2 },
    { term: 'head injury', weight: 2.5 },
    { term: 'hit and run', weight: 2.5 },
    { term: 'stabbed', weight: 2.5 },
    { term: 'crushed', weight: 2.2 },
    // Hindi (Romanized & Devanagari)
    { term: 'hadsa', weight: 2.2 },
    { term: 'durghatna', weight: 2.2 },
    { term: 'khoon beh raha', weight: 2.5 },
    { term: 'khoon nikal raha', weight: 2.5 },
    { term: 'haddi toot gayi', weight: 2.5 },
    { term: 'gadi thuk gayi', weight: 2.5 },
    { term: 'accident ho gaya', weight: 2.5 },
    { term: 'दुर्घटना', weight: 2.5 },
    { term: 'हादसा', weight: 2.2 },
    { term: 'खून बह रहा', weight: 2.5 },
    { term: 'हड्डी टूट गई', weight: 2.5 },
    { term: 'एक्सीडेंट', weight: 2.5 },
    // Kannada (Romanized & Script)
    { term: 'apaghatha', weight: 2.8 },
    { term: 'raktha barthide', weight: 2.5 },
    { term: 'moole murita', weight: 2.5 },
    { term: 'gaaya aagide', weight: 2.0 },
    { term: 'accident aagide', weight: 2.5 },
    { term: 'ಅಪಘಾತ', weight: 2.8 },
    { term: 'ರಕ್ತ ಬರುತ್ತಿದೆ', weight: 2.5 },
    { term: 'ಮೂಳೆ ಮುರಿತ', weight: 2.5 },
  ],

  pregnancy: [
    // English
    { term: 'labour pain', weight: 3.0 },
    { term: 'labor pain', weight: 3.0 },
    { term: 'water broke', weight: 3.0 },
    { term: 'contractions', weight: 2.5 },
    { term: 'pregnant', weight: 2.0 },
    { term: 'pregnancy', weight: 2.0 },
    { term: 'delivery', weight: 2.2 },
    { term: 'baby coming', weight: 3.0 },
    { term: 'childbirth', weight: 2.5 },
    { term: 'giving birth', weight: 2.8 },
    // Hindi (Romanized & Devanagari)
    { term: 'prasav peeda', weight: 3.0 },
    { term: 'bachha hone wala', weight: 2.8 },
    { term: 'delivery dard', weight: 2.5 },
    { term: 'garbhavastha', weight: 2.2 },
    { term: 'pregnant hai', weight: 2.2 },
    { term: 'प्रसव पीड़ा', weight: 3.0 },
    { term: 'बच्चा होने वाला', weight: 2.8 },
    { term: 'गर्भावस्था', weight: 2.2 },
    { term: 'डिलीवरी', weight: 2.5 },
    // Kannada (Romanized & Script)
    { term: 'herige novu', weight: 3.0 },
    { term: 'herige aaguttide', weight: 2.8 },
    { term: 'magu huttuttide', weight: 2.8 },
    { term: 'garbhini', weight: 2.2 },
    { term: 'garbhavati', weight: 2.2 },
    { term: 'ಹೆರಿಗೆ ನೋವು', weight: 3.0 },
    { term: 'ಗರ್ಭಿಣಿ', weight: 2.2 },
    { term: 'ಮಗು ಹುಟ್ಟುತ್ತಿದೆ', weight: 2.8 },
  ],

  burns: [
    // English
    { term: 'burn', weight: 2.0 },
    { term: 'burns', weight: 2.0 },
    { term: 'burned', weight: 2.0 },
    { term: 'burnt', weight: 2.0 },
    { term: 'fire', weight: 2.0 },
    { term: 'scald', weight: 2.5 },
    { term: 'cylinder blast', weight: 3.0 },
    { term: 'acid burn', weight: 3.0 },
    { term: 'skin burnt', weight: 2.5 },
    { term: 'flames', weight: 2.0 },
    // Hindi (Romanized & Devanagari)
    { term: 'jal gaya', weight: 2.8 },
    { term: 'jal gayi', weight: 2.8 },
    { term: 'aag lag gayi', weight: 2.8 },
    { term: 'aag lagi hai', weight: 2.8 },
    { term: 'jhulas gaya', weight: 2.8 },
    { term: 'cylinder phat gaya', weight: 3.0 },
    { term: 'जल गया', weight: 2.8 },
    { term: 'आग लग गई', weight: 2.8 },
    { term: 'झुलस गया', weight: 2.8 },
    // Kannada (Romanized & Script)
    { term: 'suttu hogide', weight: 2.8 },
    { term: 'suttide', weight: 2.5 },
    { term: 'benki bididide', weight: 2.8 },
    { term: 'benki', weight: 2.0 },
    { term: 'ಸುಟ್ಟು ಹೋಗಿದೆ', weight: 2.8 },
    { term: 'ಬೆಂಕಿ', weight: 2.0 },
    { term: 'ಸುಟ್ಟ ಗಾಯ', weight: 2.8 },
  ],
};

// Ambiguous keyword definitions mapping to most probable category with fixed low confidence
const AMBIGUOUS_PATTERNS = [
  {
    terms: [
      "can't breathe",
      'cannot breathe',
      'trouble breathing',
      'shortness of breath',
      'saans nahi aa rahi',
      'saans lene me takleef',
      'usiru kattuttide',
      'ಉಸಿರಾಟದ ತೊಂದರೆ',
    ],
    defaultType: 'heart_attack',
    confidence: 0.38,
  },
  {
    terms: [
      'unconscious',
      'passed out',
      'not responding',
      'behosh',
      'behosh ho gaye',
      'prajne tappide',
      'ಪ್ರಜ್ಞೆ ತಪ್ಪಿದೆ',
      'बेहोश',
    ],
    defaultType: 'heart_attack',
    confidence: 0.35,
  },
  {
    terms: ['collapsed', 'fell down', 'gir gaye', 'biddidare', 'ಬಿದ್ದಿದ್ದಾರೆ'],
    defaultType: 'trauma',
    confidence: 0.32,
  },
];

/**
 * Normalizes input speech transcripts:
 * - Lowercase
 * - Trim whitespace
 * - Replace punctuation (commas, periods, exclamation marks, question marks) with spaces
 * - Consolidate multiple whitespace characters
 * @param {string} text 
 * @returns {string}
 */
export function normalizeTranscript(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'।]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classifies speech transcript into emergency category.
 * @param {string} transcript 
 * @returns {{ type: string, confidence: number, matchedKeywords: string[], needsHumanReview: boolean }}
 */
export function classifyEmergency(transcript) {
  const normalized = normalizeTranscript(transcript);

  if (!normalized) {
    return {
      type: 'unknown',
      confidence: 0,
      matchedKeywords: [],
      needsHumanReview: true,
    };
  }

  // 1. Evaluate primary keyword dictionary matches
  const categoryScores = {
    heart_attack: { score: 0, matches: [] },
    stroke: { score: 0, matches: [] },
    trauma: { score: 0, matches: [] },
    pregnancy: { score: 0, matches: [] },
    burns: { score: 0, matches: [] },
  };

  for (const [category, keywords] of Object.entries(KEYWORD_DICTIONARY)) {
    for (const { term, weight } of keywords) {
      const termNorm = normalizeTranscript(term);
      if (normalized.includes(termNorm)) {
        categoryScores[category].score += weight;
        categoryScores[category].matches.push(term);
      }
    }
  }

  // Find best scoring category
  let bestCategory = null;
  let maxScore = 0;

  for (const [category, data] of Object.entries(categoryScores)) {
    if (data.score > maxScore) {
      maxScore = data.score;
      bestCategory = category;
    }
  }

  // If solid match found
  if (bestCategory && maxScore > 0) {
    // Map score to confidence (0.60 to 0.98)
    // A single high weight term (>= 2.5) gives ~0.75-0.85 confidence.
    // Multiple terms ramp up towards 0.98.
    const computedConfidence = Math.min(0.98, Number((0.55 + (maxScore / 5.0) * 0.40).toFixed(2)));

    return {
      type: bestCategory,
      confidence: Math.max(0.6, computedConfidence),
      matchedKeywords: categoryScores[bestCategory].matches,
      needsHumanReview: true,
    };
  }

  // 2. Check for Ambiguous inputs (e.g. "can't breathe", "unconscious")
  for (const ambiguous of AMBIGUOUS_PATTERNS) {
    for (const phrase of ambiguous.terms) {
      const normPhrase = normalizeTranscript(phrase);
      if (normalized.includes(normPhrase)) {
        return {
          type: ambiguous.defaultType,
          confidence: ambiguous.confidence,
          matchedKeywords: [phrase],
          needsHumanReview: true,
        };
      }
    }
  }

  // 3. No match found
  return {
    type: 'unknown',
    confidence: 0,
    matchedKeywords: [],
    needsHumanReview: true,
  };
}

export default classifyEmergency;
