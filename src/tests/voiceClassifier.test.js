import { describe, it, expect } from 'vitest';
import { classifyEmergency, normalizeTranscript } from '../services/voiceClassifier.js';

describe('Voice Emergency Classifier (Multilingual & Ambiguity Support)', () => {
  it('normalizes transcripts properly (lowercasing, punctuation stripping)', () => {
    const raw = '  HELP! My father has severe CHEST PAIN... please hurry?! ';
    const normalized = normalizeTranscript(raw);
    expect(normalized).toBe('help my father has severe chest pain please hurry');
  });

  // 1. English Heart Attack
  it('classifies English heart attack with high confidence', () => {
    const res = classifyEmergency('Help, my father is having severe chest pain and left arm pain!');
    expect(res.type).toBe('heart_attack');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.matchedKeywords).toContain('chest pain');
    expect(res.needsHumanReview).toBe(true);
  });

  // 2. Hindi Romanized Heart Attack
  it('classifies Hindi (Romanized) heart attack', () => {
    const res = classifyEmergency('Bhaiya jaldi aao, pitaji ke seene mein dard ho raha hai!');
    expect(res.type).toBe('heart_attack');
    expect(res.confidence).toBeGreaterThan(0.65);
    expect(res.matchedKeywords).toContain('seene mein dard');
    expect(res.needsHumanReview).toBe(true);
  });

  // 3. Hindi Devanagari Heart Attack
  it('classifies Hindi (Devanagari) heart attack', () => {
    const res = classifyEmergency('सीने में दर्द बहुत तेज है दिल का दौरा पड़ गया');
    expect(res.type).toBe('heart_attack');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.needsHumanReview).toBe(true);
  });

  // 4. Kannada Romanized Heart Attack
  it('classifies Kannada (Romanized) heart attack', () => {
    const res = classifyEmergency('Ede novu thumba aagthide, hrudayaghata aagabahudu!');
    expect(res.type).toBe('heart_attack');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.needsHumanReview).toBe(true);
  });

  // 5. Kannada Script Heart Attack
  it('classifies Kannada (Script) heart attack', () => {
    const res = classifyEmergency('ಎದೆ ನೋವು ತುಂಬಾ ಜಾಸ್ತಿ ಆಗಿದೆ ಸಹಾಯ ಮಾಡಿ');
    expect(res.type).toBe('heart_attack');
    expect(res.confidence).toBeGreaterThan(0.65);
    expect(res.needsHumanReview).toBe(true);
  });

  // 6. English Stroke
  it('classifies English stroke with face drooping and slurred speech', () => {
    const res = classifyEmergency('Her face is drooping and she cannot speak right now');
    expect(res.type).toBe('stroke');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.needsHumanReview).toBe(true);
  });

  // 7. Hindi Romanized Stroke
  it('classifies Hindi (Romanized) stroke', () => {
    const res = classifyEmergency('Mummy ka munh tedha ho gaya hai aur lakwa maar gaya hai');
    expect(res.type).toBe('stroke');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.needsHumanReview).toBe(true);
  });

  // 8. Hindi Devanagari Stroke
  it('classifies Hindi (Devanagari) stroke', () => {
    const res = classifyEmergency('लकवा मार गया है बोल नहीं पा रहे');
    expect(res.type).toBe('stroke');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.needsHumanReview).toBe(true);
  });

  // 9. Kannada Romanized Stroke
  it('classifies Kannada (Romanized) stroke', () => {
    const res = classifyEmergency('Avarige pakshaghata aagide, matanadalu aguttilla');
    expect(res.type).toBe('stroke');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.needsHumanReview).toBe(true);
  });

  // 10. Kannada Script Stroke
  it('classifies Kannada (Script) stroke', () => {
    const res = classifyEmergency('ಪಕ್ಷಘಾತ ಆಗಿದೆ ಮಾತನಾಡಲು ಆಗುತ್ತಿಲ್ಲ ಬೇಗ ಬನ್ನಿ');
    expect(res.type).toBe('stroke');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.needsHumanReview).toBe(true);
  });

  // 11. English Trauma
  it('classifies English accident and trauma with bleeding', () => {
    const res = classifyEmergency('Major car crash on airport road with heavy bleeding and broken bone');
    expect(res.type).toBe('trauma');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.needsHumanReview).toBe(true);
  });

  // 12. Hindi Romanized Trauma
  it('classifies Hindi (Romanized) trauma', () => {
    const res = classifyEmergency('Highway par accident ho gaya hai, bahut khoon beh raha hai');
    expect(res.type).toBe('trauma');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.needsHumanReview).toBe(true);
  });

  // 13. Kannada Romanized Trauma
  it('classifies Kannada (Romanized) trauma', () => {
    const res = classifyEmergency('Rasteyalli apaghatha aagide, raktha barthide ambulance beku');
    expect(res.type).toBe('trauma');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.needsHumanReview).toBe(true);
  });

  // 14. English Pregnancy
  it('classifies English labour pain and pregnancy emergency', () => {
    const res = classifyEmergency('Her water broke and labour pain started, baby is coming!');
    expect(res.type).toBe('pregnancy');
    expect(res.confidence).toBeGreaterThan(0.75);
    expect(res.needsHumanReview).toBe(true);
  });

  // 15. Hindi Romanized Pregnancy
  it('classifies Hindi (Romanized) pregnancy', () => {
    const res = classifyEmergency('Prasav peeda shuru ho gayi hai, delivery dard ho raha hai');
    expect(res.type).toBe('pregnancy');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.needsHumanReview).toBe(true);
  });

  // 16. Kannada Script Pregnancy
  it('classifies Kannada (Script) pregnancy', () => {
    const res = classifyEmergency('ಹೆರಿಗೆ ನೋವು ಶುರುವಾಗಿದೆ ಆಸ್ಪತ್ರೆಗೆ ಕಳುಹಿಸಿ');
    expect(res.type).toBe('pregnancy');
    expect(res.confidence).toBeGreaterThan(0.65);
    expect(res.needsHumanReview).toBe(true);
  });

  // 17. English Burns
  it('classifies English burn emergency with cylinder blast', () => {
    const res = classifyEmergency('There was a cylinder blast in the kitchen, severe burns and fire everywhere!');
    expect(res.type).toBe('burns');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.needsHumanReview).toBe(true);
  });

  // 18. Hindi Romanized Burns
  it('classifies Hindi (Romanized) burns', () => {
    const res = classifyEmergency('Ghar me aag lag gayi hai, haath jal gaya hai');
    expect(res.type).toBe('burns');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.needsHumanReview).toBe(true);
  });

  // 19. Kannada Script Burns
  it('classifies Kannada (Script) burns', () => {
    const res = classifyEmergency('ಬೆಂಕಿ ಬಿದ್ದಿದೆ ಕೈ ಸುಟ್ಟು ಹೋಗಿದೆ ಸಹಾಯ ಮಾಡಿ');
    expect(res.type).toBe('burns');
    expect(res.confidence).toBeGreaterThan(0.65);
    expect(res.needsHumanReview).toBe(true);
  });

  // 20. Ambiguous Input - "can't breathe"
  it('maps ambiguous input "can\'t breathe" to heart_attack with low confidence', () => {
    const res = classifyEmergency("Help me he can't breathe!");
    expect(res.type).toBe('heart_attack');
    expect(res.confidence).toBeLessThanOrEqual(0.45);
    expect(res.needsHumanReview).toBe(true);
  });

  // 21. Ambiguous Input - "unconscious"
  it('maps ambiguous input "unconscious" to heart_attack with low confidence', () => {
    const res = classifyEmergency('A person is unconscious on the sidewalk');
    expect(res.type).toBe('heart_attack');
    expect(res.confidence).toBeLessThanOrEqual(0.45);
    expect(res.needsHumanReview).toBe(true);
  });

  // 22. Unknown Transcript
  it('returns unknown with 0 confidence when no keywords match', () => {
    const res = classifyEmergency('Hello, can you hear me? Where are you?');
    expect(res.type).toBe('unknown');
    expect(res.confidence).toBe(0);
    expect(res.matchedKeywords).toEqual([]);
    expect(res.needsHumanReview).toBe(true);
  });

  // 23. Empty input
  it('handles empty input gracefully', () => {
    const res = classifyEmergency('');
    expect(res.type).toBe('unknown');
    expect(res.confidence).toBe(0);
    expect(res.needsHumanReview).toBe(true);
  });
});
