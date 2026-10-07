// src/pages/SOS.jsx - Calming Multilingual Patient SOS Portal
import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  HeartPulse,
  Brain,
  AlertTriangle,
  Baby,
  Flame,
  Send,
  XCircle,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';

import AppShell from '../components/AppShell.jsx';
import Card from '../components/shared/Card.jsx';
import Button from '../components/shared/Button.jsx';
import { useToast } from '../hooks/useToast.js';
import { classifyEmergency } from '../services/voiceClassifier.js';
import { createIncident, cancelIncident } from '../services/incidentService.js';
import { DEMO_LOCATION } from '../config/constants.js';

import './SOS.css';

const LANGUAGE_CONFIG = {
  en: {
    code: 'en-IN',
    title: 'Emergency Help',
    subtitle: 'Press the golden button and tell us what happened.',
    listening: 'Listening… speak calmly',
    pressToSpeak: 'Press & Speak',
    tapToStop: 'Tap to Finish',
    orType: 'Or type your emergency:',
    fallbackTitle: 'Or select what is happening:',
    arrangingTitle: 'Help is being arranged.',
    arrangingSubtitle: 'A dispatcher is confirming the best hospital for your emergency right now.',
    cancelBtn: 'Cancel Emergency Call',
    demoNote: 'Demo Mode: Simulating emergency response in Bangalore.',
  },
  hi: {
    code: 'hi-IN',
    title: 'आपातकालीन सहायता (Emergency SOS)',
    subtitle: 'बटन दबाएं और बताएं क्या हुआ है।',
    listening: 'सुन रहे हैं… कृपया बताएं',
    pressToSpeak: 'बोलने के लिए दबाएं',
    tapToStop: 'पूरा करने के लिए दबाएं',
    orType: 'या यहां लिखें:',
    fallbackTitle: 'या आपातकाल का चयन करें:',
    arrangingTitle: 'सहायता भेजी जा रही है।',
    arrangingSubtitle: 'डिस्पैचर आपके लिए सबसे उपयुक्त अस्पताल की पुष्टि कर रहा है।',
    cancelBtn: 'आपातकाल रद्द करें',
    demoNote: 'डेमो मोड: बेंगलुरु में आपातकालीन प्रतिक्रिया का परीक्षण।',
  },
  kn: {
    code: 'kn-IN',
    title: 'ತುರ್ತು ಸಹಾಯ (Emergency SOS)',
    subtitle: 'ಗುಂಡಿಯನ್ನು ಒತ್ತಿ ಏನಾಗಿದೆ ಎಂದು ತಿಳಿಸಿ.',
    listening: 'ಕೇಳುತ್ತಿದ್ದೇವೆ… ದಯವಿಟ್ಟು ಮಾತನಾಡಿ',
    pressToSpeak: 'ಮಾತನಾಡಲು ಒತ್ತಿ',
    tapToStop: 'ಮುಗಿಸಲು ಒತ್ತಿ',
    orType: 'ಅಥವಾ ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ:',
    fallbackTitle: 'ಅಥವಾ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ:',
    arrangingTitle: 'ಸಹಾಯವನ್ನು ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ.',
    arrangingSubtitle: 'ನಿಮ್ಮ ತುರ್ತುಸ್ಥಿತಿಗೆ ಸರಿಯಾದ ಆಸ್ಪತ್ರೆಯನ್ನು ನಿಯೋಜಿಸಲಾಗುತ್ತಿದೆ.',
    cancelBtn: 'ತುರ್ತು ಕರೆಯನ್ನು ರದ್ದುಗೊಳಿಸಿ',
    demoNote: 'ಡೆಮೊ ಮೋಡ್: ಬೆಂಗಳೂರಿನಲ್ಲಿ ತುರ್ತು ಪ್ರತಿಕ್ರಿಯೆ ವ್ಯವಸ್ಥೆ.',
  },
};

const EMERGENCY_BUTTONS = [
  { id: 'heart_attack', label: 'Heart Attack', labelHi: 'सीने में दर्द / दिल का दौरा', labelKn: 'ಎದೆ ನೋವು / ಹೃದಯಾಘಾತ', icon: HeartPulse },
  { id: 'stroke', label: 'Stroke / Paralysis', labelHi: 'लकवा / स्ट्रोक', labelKn: 'ಪಕ್ಷಘಾತ / ಲಕ್ವಾ', icon: Brain },
  { id: 'trauma', label: 'Accident / Bleeding', labelHi: 'दुर्घटना / खून बहना', labelKn: 'ಅಪಘಾತ / ರಕ್ತಸ್ರಾವ', icon: AlertTriangle },
  { id: 'pregnancy', label: 'Labour / Delivery', labelHi: 'प्रसव पीड़ा', labelKn: 'ಹೆರಿಗೆ ನೋವು', icon: Baby },
  { id: 'burns', label: 'Severe Burns', labelHi: 'आग / जल गया', labelKn: 'ಸುಟ್ಟ ಗಾಯ', icon: Flame },
];

export function SOS() {
  const { showToast } = useToast();
  const [lang, setLang] = useState('en');
  const t = LANGUAGE_CONFIG[lang] || LANGUAGE_CONFIG.en;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [createdIncident, setCreatedIncident] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recognitionRef = useRef(null);

  // Request browser geolocation on mount (with Hebbal fallback)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: 'Your Current Location',
          });
        },
        () => {
          // Fallback to Hebbal demo location
          setUserLocation({
            lat: DEMO_LOCATION.latitude,
            lng: DEMO_LOCATION.longitude,
            label: DEMO_LOCATION.label,
          });
        },
        { timeout: 8000 }
      );
    } else {
      setUserLocation({
        lat: DEMO_LOCATION.latitude,
        lng: DEMO_LOCATION.longitude,
        label: DEMO_LOCATION.label,
      });
    }
  }, []);

  // Web Speech API Initialization
  const startSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser. Please use the text or buttons below.', 'warning', 4500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = t.code;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
      };

      recognition.onerror = (event) => {
        console.warn('[SOS] Speech Recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          showToast('Microphone access denied. Please use the buttons below.', 'warning', 4000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[SOS] Speech recognition start error:', err);
      setIsListening(false);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);

      // Submit transcript if we have spoken text
      if (transcript.trim().length > 0) {
        handleSubmitIncident(transcript, null);
      }
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  // Submit emergency incident helper
  const handleSubmitIncident = async (text, explicitCategory = null) => {
    try {
      setIsSubmitting(true);
      const textToUse = text || (explicitCategory ? `Emergency: ${explicitCategory}` : 'Emergency SOS call');

      // Run voice classifier
      const classification = classifyEmergency(textToUse);
      const emergencyType = explicitCategory || (classification.type !== 'unknown' ? classification.type : null);

      const loc = userLocation || {
        lat: DEMO_LOCATION.latitude,
        lng: DEMO_LOCATION.longitude,
        label: DEMO_LOCATION.label,
      };

      const incident = await createIncident({
        source: 'voice',
        transcript: textToUse,
        suggestedType: classification.type,
        emergencyType: emergencyType,
        patientLocation: loc,
      });

      setCreatedIncident(incident);
      showToast('Emergency SOS dispatched! Connecting with Bangalore dispatchers.', 'success', 4000);
    } catch (err) {
      console.error('[SOS] Error creating incident:', err);
      showToast(`Submission error: ${err.message}`, 'error', 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Emergency handler
  const handleCancel = async () => {
    if (!createdIncident) return;
    try {
      await cancelIncident(createdIncident.id, 'Cancelled by caller');
      setCreatedIncident(null);
      setTranscript('');
      setManualText('');
      showToast('Emergency call cancelled.', 'info', 3000);
    } catch (err) {
      showToast(`Cancel failed: ${err.message}`, 'error', 3000);
    }
  };

  return (
    <AppShell
      activeLanguage={lang}
      onLanguageChange={(newLang) => setLang(newLang)}
      title="Patient Emergency SOS"
    >
      <div className="gh-sos-page">
        {/* Header Text */}
        <div className="gh-sos-hero-text">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>

        {/* State A: Help is being arranged */}
        {createdIncident ? (
          <div className="gh-sos-arranging-card" role="alert">
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'var(--gh-success-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle2 size={36} color="var(--gh-success)" />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gh-text)' }}>
              {t.arrangingTitle}
            </h2>

            <p style={{ color: 'var(--gh-text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              {t.arrangingSubtitle}
            </p>

            <div style={{
              padding: '12px 18px',
              backgroundColor: 'var(--gh-surface-2)',
              borderRadius: 'var(--gh-radius)',
              border: '1px solid var(--gh-border)',
              width: '100%',
              fontSize: '0.88rem',
            }}>
              <div><strong>Incident Ref:</strong> #{createdIncident.id.slice(0, 8)}</div>
              <div>📍 <strong>Location:</strong> {createdIncident.patientLocation?.label || 'Hebbal, Bangalore'}</div>
              {createdIncident.suggestedType && (
                <div>🩺 <strong>Triage Category:</strong> {createdIncident.suggestedType} (AI Suggested)</div>
              )}
            </div>

            <Button
              variant="danger"
              size="lg"
              fullWidth
              onClick={handleCancel}
              icon={<XCircle size={20} />}
            >
              {t.cancelBtn}
            </Button>
          </div>
        ) : (
          /* State B: Mic & Fallback Triage */
          <>
            {/* Giant Calming Mic Button */}
            <div className="gh-mic-button-wrap">
              <button
                type="button"
                className={`gh-mic-button ${isListening ? 'gh-mic-button--listening' : ''}`}
                onClick={toggleMic}
                aria-label={isListening ? t.tapToStop : t.pressToSpeak}
              >
                {isListening ? (
                  <MicOff size={44} strokeWidth={2.5} />
                ) : (
                  <Mic size={44} strokeWidth={2.5} />
                )}
                <span className="gh-mic-label">
                  {isListening ? t.tapToStop : t.pressToSpeak}
                </span>
              </button>
            </div>

            {/* Transcript Card if text exists */}
            {(isListening || transcript) && (
              <div className="gh-sos-transcript-card">
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gh-accent)', textTransform: 'uppercase' }}>
                  {isListening ? t.listening : 'Captured Audio Summary'}
                </span>
                <div className="gh-sos-transcript-text">
                  {transcript || '…'}
                </div>
                {!isListening && transcript && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleSubmitIncident(transcript, null)}
                    loading={isSubmitting}
                    icon={<Send size={16} />}
                  >
                    Confirm &amp; Alert Dispatcher
                  </Button>
                )}
              </div>
            )}

            {/* Reliable Fallback: 5 Large Category Buttons */}
            <div style={{ width: '100%', marginTop: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gh-text-muted)', marginBottom: '12px' }}>
                {t.fallbackTitle}
              </div>

              <div className="gh-sos-fallback-grid">
                {EMERGENCY_BUTTONS.map((btn) => {
                  const Icon = btn.icon;
                  const label = lang === 'hi' ? btn.labelHi : lang === 'kn' ? btn.labelKn : btn.label;

                  return (
                    <button
                      key={btn.id}
                      type="button"
                      className="gh-sos-fallback-btn"
                      onClick={() => handleSubmitIncident(btn.label, btn.id)}
                      disabled={isSubmitting}
                    >
                      <Icon size={24} color="var(--gh-accent)" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Or type text fallback */}
            <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder={t.orType}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualText.trim()) {
                    handleSubmitIncident(manualText.trim(), null);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 'var(--gh-radius)',
                  border: '1px solid var(--gh-border)',
                  backgroundColor: 'var(--gh-surface)',
                  color: 'var(--gh-text)',
                  fontSize: '0.92rem',
                }}
              />
              <Button
                variant="primary"
                onClick={() => {
                  if (manualText.trim()) handleSubmitIncident(manualText.trim(), null);
                }}
                disabled={!manualText.trim() || isSubmitting}
                icon={<Send size={16} />}
              >
                Send
              </Button>
            </div>
          </>
        )}

        {/* Demo Disclaimer */}
        <div style={{ fontSize: '0.78rem', color: 'var(--gh-text-muted)', borderTop: '1px solid var(--gh-border)', paddingTop: '16px', width: '100%' }}>
          <Sparkles size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          <span>{t.demoNote} Voice categorization is a clinical suggestion requiring human dispatcher confirmation.</span>
        </div>
      </div>
    </AppShell>
  );
}

export default SOS;
