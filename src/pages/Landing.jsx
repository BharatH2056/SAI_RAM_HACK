// src/pages/Landing.jsx - GoldenHour Landing Page with Demo Quickstart
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  LayoutDashboard,
  Building2,
  Truck,
  PhoneCall,
  Play,
  RotateCcw,
  Sparkles,
  Clock,
  Lock,
} from 'lucide-react';
import AppShell from '../components/AppShell.jsx';
import Button from '../components/shared/Button.jsx';
import { useToast } from '../hooks/useToast.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { createIncident } from '../services/incidentService.js';
import { updateHospitalStatus } from '../services/hospitalService.js';
import './Landing.css';

export function Landing() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, role } = useAuth();
  const [startingDemo, setStartingDemo] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);


  const handleStartDemo = async () => {
    try {
      setStartingDemo(true);
      showToast('Initializing Hebbal heart attack emergency incident…', 'info', 2000);

      // Create Hebbal Heart Attack Demo Incident
      const incident = await createIncident({
        source: 'dispatcher',
        transcript: 'Emergency SOS: 58-year-old male with crushing substernal chest pain, radiating down left arm. Onset 25 minutes ago at Hebbal.',
        suggestedType: 'heart_attack',
        emergencyType: 'heart_attack',
        patientLocation: {
          lat: 13.0358,
          lng: 77.5970,
          label: 'Hebbal, Bangalore',
        },
      });

      showToast('Incident created. Opening Dispatch Command Center…', 'success', 2500);
      navigate('/dispatcher', { state: { incidentId: incident.id } });
    } catch (err) {
      console.error('[Landing] Failed to start demo:', err);
      showToast(`Demo creation failed: ${err.message}`, 'error', 4000);
    } finally {
      setStartingDemo(false);
    }
  };

  const handleResetDemoData = async () => {
    try {
      setResettingDemo(true);
      setShowResetConfirm(false);
      showToast('Restoring hospital bed counts and demo baselines…', 'info', 2000);

      // Restore baseline states for demo hospitals (Ramaiah H23 = 5 beds)
      try {
        await updateHospitalStatus('H23', { icu_beds_available: 5 });
      } catch (e) {
        // Safe to ignore if H23 is already 5 or unavailable
      }

      showToast('Demo baseline restored successfully! You can run "npm run reset-demo" in terminal for full wipe.', 'success', 4000);
    } catch (err) {
      console.error('[Landing] Reset failed:', err);
      showToast(`Reset error: ${err.message}`, 'error', 4000);
    } finally {
      setResettingDemo(false);
    }
  };

  return (
    <AppShell defaultScreenTheme="dark" title="Emergency Routing Platform">
      <div className="gh-landing">
        {/* Hero Section */}
        <section className="gh-landing__hero" aria-labelledby="hero-heading">
          <div className="gh-landing__tag">
            <Sparkles size={14} aria-hidden="true" />
            <span>Bangalore Emergency Dispatch · 24h Hackathon</span>
          </div>

          <h1 id="hero-heading" className="gh-landing__headline">
            The nearest hospital isn’t always the{' '}
            <span style={{ color: 'var(--gh-accent)' }}>right hospital</span>.
          </h1>

          <p className="gh-landing__subline">
            During STEMI heart attacks, acute strokes, and major polytrauma, routing to a facility
            without an active Cath Lab or full ICU causes critical secondary transfer delays.
            GoldenHour matches verified clinical capability before the ambulance departs.
          </p>
        </section>

        {/* Before / After Comparison */}
        <section aria-labelledby="comparison-heading">
          <h2 id="comparison-heading" className="sr-only">Clinical Comparison: Old Way vs GoldenHour</h2>
          <div className="gh-landing__comparison">
            {/* The Old Way */}
            <div className="gh-compare-card gh-compare-card--old">
              <div className="gh-compare-card__header">
                <div className="gh-compare-card__title">
                  <XCircle size={20} color="var(--gh-danger)" aria-hidden="true" />
                  <span>The Old Way (Default Routing)</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--gh-danger)', fontWeight: 700 }}>
                  FAILED TRIAGE
                </span>
              </div>

              <div className="gh-compare-card__steps">
                <div className="gh-compare-step">
                  <span className="gh-compare-step__icon">📍</span>
                  <div>
                    <strong>Route to nearest hospital</strong>
                    <div className="gh-compare-step__desc">Dispatched solely on shortest straight-line distance.</div>
                  </div>
                </div>

                <div className="gh-compare-step">
                  <span className="gh-compare-step__icon">🚫</span>
                  <div>
                    <strong>Arrival at unprepared facility</strong>
                    <div className="gh-compare-step__desc">Hospital lacks 24/7 Cath Lab or has 0 ICU beds. Patient cannot be treated.</div>
                  </div>
                </div>

                <div className="gh-compare-step">
                  <span className="gh-compare-step__icon">⏳</span>
                  <div>
                    <strong>Inter-hospital transfer required</strong>
                    <div className="gh-compare-step__desc">10-15 minute transfer coordination delay + second ambulance transit.</div>
                  </div>
                </div>
              </div>

              <div className="gh-compare-card__outcome">
                <span style={{ color: 'var(--gh-danger)' }}>Lost Golden Hour Time</span>
                <span style={{ color: 'var(--gh-danger)', fontSize: '1.2rem' }}>+12 to 20 min</span>
              </div>
            </div>

            {/* The GoldenHour Way */}
            <div className="gh-compare-card gh-compare-card--golden">
              <div className="gh-compare-card__header">
                <div className="gh-compare-card__title">
                  <CheckCircle2 size={20} color="var(--gh-accent)" aria-hidden="true" />
                  <span>The GoldenHour Way (Intelligent Dispatch)</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--gh-accent)', fontWeight: 700 }}>
                  CAPABILITY FIRST
                </span>
              </div>

              <div className="gh-compare-card__steps">
                <div className="gh-compare-step">
                  <span className="gh-compare-step__icon">🧠</span>
                  <div>
                    <strong>Clinical capability filtering</strong>
                    <div className="gh-compare-step__desc">Verifies Cath Lab, ICU bed availability, and on-duty specialists instantly.</div>
                  </div>
                </div>

                <div className="gh-compare-step">
                  <span className="gh-compare-step__icon">🛣️</span>
                  <div>
                    <strong>Consistent road ETA ranking</strong>
                    <div className="gh-compare-step__desc">Direct route to the nearest qualified facility via live road geometry.</div>
                  </div>
                </div>

                <div className="gh-compare-step">
                  <span className="gh-compare-step__icon">⚡</span>
                  <div>
                    <strong>Pre-arrival ER team alert</strong>
                    <div className="gh-compare-step__desc">Hospital trauma/cardiac team accepts and preps bay before ambulance arrives.</div>
                  </div>
                </div>
              </div>

              <div className="gh-compare-card__outcome">
                <span style={{ color: 'var(--gh-accent)' }}>Direct Treatment Time Saved</span>
                <span style={{ color: 'var(--gh-accent)', fontSize: '1.2rem' }}>⚡ ~11.5 minutes</span>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Mode Action Box */}
        <section aria-labelledby="demo-heading">
          <div className="gh-demo-box">
            <div className="gh-demo-box__content">
              <h2 id="demo-heading" className="gh-demo-box__title">
                <Play size={20} color="var(--gh-accent)" aria-hidden="true" />
                Live Hackathon Demo Mode
              </h2>
              <p className="gh-demo-box__desc">
                Launch the standardized Hebbal heart-attack scenario (Lat 13.0358, Lng 77.5970).
                Demonstrates Baptist Hospital (nearest, no Cath Lab) exclusion, Apollo/Mallya (ICU full) exclusion,
                and direct routing to Ramaiah Memorial Hospital with 11.5 minutes saved.
              </p>
            </div>

            <div className="gh-demo-box__actions">
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartDemo}
                loading={startingDemo}
                icon={<Play size={18} />}
              >
                Start Hebbal Demo
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                disabled={resettingDemo}
                icon={<RotateCcw size={14} />}
              >
                Reset Demo Data
              </Button>
            </div>
          </div>
        </section>

        {/* Confirmation Modal for Reset */}
        {showResetConfirm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-dialog-title"
          >
            <div
              style={{
                backgroundColor: 'var(--gh-surface)',
                border: '1px solid var(--gh-border)',
                borderRadius: 'var(--gh-radius-lg)',
                padding: '28px',
                maxWidth: '460px',
                width: '100%',
                boxShadow: 'var(--gh-shadow-lg)',
              }}
            >
              <h3 id="reset-dialog-title" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>
                Reset Demo Hospital Data?
              </h3>
              <p style={{ color: 'var(--gh-text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                This will reset bed counts on demo facilities back to baseline. Are you sure you want to proceed?
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button variant="ghost" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleResetDemoData}
                  loading={resettingDemo}
                  icon={<RotateCcw size={16} />}
                >
                  Confirm Reset
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 4 Role Screens Grid */}
        <section aria-labelledby="roles-heading">
          <h2 id="roles-heading" className="gh-landing__section-title">
            Explore System Screens
          </h2>
          <p className="gh-landing__section-desc">
            Four specialized interfaces designed for each stakeholder in the critical golden hour.
          </p>

          <div className="gh-roles-grid">
            {[
              {
                to: '/dispatcher',
                icon: <LayoutDashboard size={24} aria-hidden="true" />,
                title: 'Dispatcher Command',
                desc: 'Desktop-first three-column triage center with live map, clinical filter cards, and one-click dispatch commitment.',
                action: 'Launch Dispatcher',
                allowedRoles: ['dispatcher', 'admin'],
              },
              {
                to: '/hospital',
                icon: <Building2 size={24} aria-hidden="true" />,
                title: 'Hospital ER Desk',
                desc: 'Pre-arrival notification dashboard with ETA countdown, trauma team acceptance, and real-time ICU bed stepper.',
                action: 'Open ER Desk',
                allowedRoles: ['hospital', 'admin'],
              },
              {
                to: '/driver',
                icon: <Truck size={24} aria-hidden="true" />,
                title: 'Ambulance Driver',
                desc: 'Mobile-first glance-and-go navigation with large countdown, one-tap Google Maps directions, and virtual trip simulator.',
                action: 'Open Driver View',
                allowedRoles: ['driver', 'admin'],
              },
              {
                to: '/sos',
                icon: <PhoneCall size={24} aria-hidden="true" />,
                title: 'Patient Voice SOS',
                desc: 'Calming emergency helper with speech recognition across English, Hindi, and Kannada, plus reliable manual emergency triggers.',
                action: 'Open SOS Portal',
                allowedRoles: null, // public
              },
            ].map((card) => {
              const canAccess =
                !card.allowedRoles ||               // public
                !card.allowedRoles.length ||        // public
                (user && role && card.allowedRoles.includes(role)); // logged in with correct role

              if (canAccess) {
                return (
                  <Link key={card.to} to={card.to} className="gh-role-card">
                    <div className="gh-role-card__icon-wrap">{card.icon}</div>
                    <h3 className="gh-role-card__title">{card.title}</h3>
                    <p className="gh-role-card__desc">{card.desc}</p>
                    <div className="gh-role-card__action">
                      <span>{card.action}</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </div>
                  </Link>
                );
              }

              // Locked card
              return (
                <Link
                  key={card.to}
                  to="/login"
                  className="gh-role-card gh-role-card--locked"
                  aria-label={`${card.title} – Login required`}
                >
                  <div className="gh-role-card__icon-wrap" style={{ opacity: 0.4 }}>{card.icon}</div>
                  <h3 className="gh-role-card__title" style={{ opacity: 0.5 }}>{card.title}</h3>
                  <p className="gh-role-card__desc" style={{ opacity: 0.45 }}>{card.desc}</p>
                  <div className="gh-role-card__action gh-role-card__action--locked">
                    <Lock size={14} aria-hidden="true" />
                    <span>Login required</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>


        {/* Footer */}
        <footer className="gh-landing__footer" role="contentinfo">
          <p>
            <strong>Hospital names and locations are real Bangalore coordinates.</strong> Clinical capabilities,
            bed counts, and specialist rosters are simulated sample data for demonstration. The 10-minute inter-hospital
            transfer delay is an evidence-based clinical planning assumption.
          </p>
        </footer>
      </div>
    </AppShell>
  );
}

export default Landing;
