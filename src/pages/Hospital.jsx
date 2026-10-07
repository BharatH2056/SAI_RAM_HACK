// src/pages/Hospital.jsx - Hospital ER Desk Screen
import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Plus,
  X,
  Radio,
  Check,
  ShieldCheck,
} from 'lucide-react';

import AppShell from '../components/AppShell.jsx';
import Card from '../components/shared/Card.jsx';
import Button from '../components/shared/Button.jsx';
import StatusBadge from '../components/shared/StatusBadge.jsx';
import BigNumber from '../components/shared/BigNumber.jsx';
import EmptyState from '../components/shared/EmptyState.jsx';
import Skeleton from '../components/shared/Skeleton.jsx';
import GoldenHourRing from '../components/hospital/GoldenHourRing.jsx';
import { useToast } from '../hooks/useToast.js';
import useHospitals from '../hooks/useHospitals.js';
import { useAuth } from '../auth/AuthContext.jsx';

import {
  subscribeToIncomingForHospital,
  hospitalAccept,
} from '../services/incidentService.js';
import { updateHospitalStatus } from '../services/hospitalService.js';
import { getRules } from '../data/emergencyRules.js';

import './Hospital.css';


const PRESET_SPECIALISTS = [
  'Cardiologist',
  'Cardiac Surgeon',
  'Neurologist',
  'Neurosurgeon',
  'Trauma Surgeon',
  'Orthopedic Surgeon',
  'Obstetrician',
  'Burn Specialist',
];

const CAPABILITY_DEFINITIONS = [
  { key: 'has_cath_lab', label: 'Cath Lab (Angioplasty)' },
  { key: 'has_stroke_unit', label: 'Dedicated Stroke Unit' },
  { key: 'has_trauma_center', label: 'Level-1 Trauma Center' },
  { key: 'has_blood_bank', label: '24/7 Blood Bank' },
  { key: 'has_maternity', label: 'Maternity Unit & NICU' },
  { key: 'has_burn_unit', label: 'Burn Resuscitation Unit' },
  { key: 'emergency_24x7', label: '24/7 Emergency Department' },
];

export function Hospital() {
  const { showToast } = useToast();
  const { hospitals, loading: loadingHospitals } = useHospitals();
  const { hospitalId: authHospitalId } = useAuth();

  // Use hospitalId from auth context; fall back to H23 for admin/dev convenience
  const selectedHospitalId = authHospitalId || 'H23';

  const [incomingIncidents, setIncomingIncidents] = useState([]);
  const [loadingIncoming, setLoadingIncoming] = useState(true);
  const [updatingField, setUpdatingField] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);

  // Find active hospital object
  const activeHospital = useMemo(() => {
    if (!hospitals || hospitals.length === 0) return null;
    return (
      hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0]
    );
  }, [hospitals, selectedHospitalId]);


  // Subscribe to incoming emergencies directed to this hospital
  useEffect(() => {
    if (!activeHospital?.id) return;

    setLoadingIncoming(true);
    const unsub = subscribeToIncomingForHospital(
      activeHospital.id,
      (list) => {
        setIncomingIncidents(list || []);
        setLoadingIncoming(false);
      },
      (err) => {
        console.error('[Hospital] Error loading incoming patients:', err);
        setLoadingIncoming(false);
      }
    );

    return () => unsub();
  }, [activeHospital?.id]);

  // Handler: Hospital accepts incoming patient
  const handleAcceptPatient = async (incidentId) => {
    try {
      setAcceptingId(incidentId);
      await hospitalAccept(incidentId);
      showToast('Emergency Bay & Trauma Team confirmed READY!', 'success', 3500);
    } catch (err) {
      console.error('[Hospital] Accept error:', err);
      showToast(`Accept failed: ${err.message}`, 'error', 4000);
    } finally {
      setAcceptingId(null);
    }
  };

  // Handler: Update bed count via stepper
  const handleBedsChange = async (delta) => {
    if (!activeHospital || updatingField) return;
    const current = Number(activeHospital.icu_beds_available ?? 0);
    const updated = Math.max(0, current + delta);
    if (current === updated) return;

    try {
      setUpdatingField(true);
      await updateHospitalStatus(activeHospital.id, {
        icu_beds_available: updated,
      });
      showToast(`ICU beds updated: ${updated} available`, 'success', 2000);
    } catch (err) {
      showToast(`Bed update failed: ${err.message}`, 'error', 3500);
    } finally {
      setUpdatingField(false);
    }
  };

  // Handler: Toggle clinical capabilities
  const handleToggleCapability = async (key) => {
    if (!activeHospital || updatingField) return;
    const currentVal = Boolean(activeHospital[key]);

    try {
      setUpdatingField(true);
      await updateHospitalStatus(activeHospital.id, {
        [key]: !currentVal,
      });
      showToast(`Capability updated: ${!currentVal ? 'ENABLED' : 'DISABLED'}`, 'info', 2000);
    } catch (err) {
      showToast(`Capability update failed: ${err.message}`, 'error', 3500);
    } finally {
      setUpdatingField(false);
    }
  };

  // Handler: Add / Remove Specialist
  const handleToggleSpecialist = async (specName) => {
    if (!activeHospital || updatingField) return;
    const currentSpecs = Array.isArray(activeHospital.specialists_on_duty)
      ? [...activeHospital.specialists_on_duty]
      : [];

    const norm = specName.toLowerCase();
    const exists = currentSpecs.some((s) => s.toLowerCase() === norm);
    const updated = exists
      ? currentSpecs.filter((s) => s.toLowerCase() !== norm)
      : [...currentSpecs, specName.toLowerCase()];

    try {
      setUpdatingField(true);
      await updateHospitalStatus(activeHospital.id, {
        specialists_on_duty: updated,
      });
      showToast(`Specialist roster updated: ${specName}`, 'info', 2000);
    } catch (err) {
      showToast(`Roster update failed: ${err.message}`, 'error', 3500);
    } finally {
      setUpdatingField(false);
    }
  };

  return (
    <AppShell defaultScreenTheme="light" title="Hospital ER Desk">
      <div className="gh-hospital-page">
        {/* Header: Facility Selector */}
        <Card className="gh-hospital-header-card">
          <div className="gh-hospital-select-group">
            <Building2 size={24} color="var(--gh-accent)" aria-hidden="true" />
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gh-text-muted)', display: 'block', textTransform: 'uppercase' }}>
                Active Emergency Receiving Facility
              </span>
              {loadingHospitals ? (
                <Skeleton width="280px" height="38px" />
              ) : (
                <div
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: 'var(--gh-text)',
                    padding: '6px 0',
                  }}
                  aria-label={`Logged in as: ${activeHospital?.name || selectedHospitalId}`}
                >
                  {activeHospital?.name || selectedHospitalId}
                  {activeHospital?.area && (
                    <span style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--gh-text-muted)', marginLeft: '8px' }}>
                      ({activeHospital.area})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {activeHospital && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--gh-text-muted)' }}>Location Area</span>
                <strong style={{ fontSize: '0.95rem' }}>{activeHospital.area || 'Bangalore'}</strong>
              </div>
              <div style={{
                padding: '6px 12px',
                borderRadius: 'var(--gh-radius-sm)',
                backgroundColor: activeHospital.emergency_24x7 ? 'var(--gh-success-light)' : 'var(--gh-danger-light)',
                color: activeHospital.emergency_24x7 ? 'var(--gh-success)' : 'var(--gh-danger)',
                fontWeight: 700,
                fontSize: '0.82rem',
              }}>
                {activeHospital.emergency_24x7 ? '✓ 24x7 Trauma Active' : '✕ No 24x7 ER'}
              </div>
            </div>
          )}
        </Card>

        {/* Two-Panel Layout */}
        <div className="gh-hospital-grid">
          {/* ── PANEL A: Incoming Patient Alerts ── */}
          <section className="gh-incoming-panel" aria-labelledby="incoming-alert-title">
            <div className="gh-col-header">
              <div className="gh-col-title" id="incoming-alert-title">
                <Radio size={20} color="var(--gh-danger)" aria-hidden="true" />
                <span>Incoming Emergency Alerts ({incomingIncidents.length})</span>
              </div>
            </div>

            {loadingIncoming ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Skeleton height="180px" />
              </div>
            ) : incomingIncidents.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No Inbound Ambulances"
                description="Emergency bay is clear. Live alerts will trigger here in real time the moment a dispatcher commits a route to your facility."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {incomingIncidents.map((incident) => {
                  const rule = getRules(incident.emergencyType);
                  const isAccepted = incident.status === 'accepted' || incident.status === 'enroute';
                  const isArrived = incident.status === 'arrived';

                  return (
                    <div
                      key={incident.id}
                      className="gh-incoming-card gh-incoming-card--pulsing"
                      role="alert"
                    >
                      <div className="gh-incoming-card__top">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{
                              backgroundColor: 'var(--gh-danger)',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                            }}>
                              INCOMING TRAUMA
                            </span>
                            <StatusBadge status={incident.status} />
                          </div>

                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gh-text)' }}>
                            {rule?.label || incident.emergencyType || 'Critical Emergency'}
                          </h3>
                        </div>

                        {/* Circular Countdown Ring */}
                        <GoldenHourRing
                          initialMinutes={incident.etaMinutes || 8}
                          size={110}
                          strokeWidth={6}
                          label="Minutes ETA"
                        />
                      </div>

                      {/* Patient Call Details */}
                      <div className="gh-incoming-patient-details">
                        <div style={{ fontWeight: 600, color: 'var(--gh-text-muted)', marginBottom: '4px' }}>
                          Dispatch Call Summary:
                        </div>
                        <div style={{ fontStyle: 'italic', color: 'var(--gh-text)' }}>
                          "{incident.transcript || 'Inbound critical emergency transfer.'}"
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--gh-text-muted)' }}>
                          📍 Origin: <strong>{incident.patientLocation?.label || 'Hebbal, Bangalore'}</strong>
                        </div>
                      </div>

                      {/* Ready Acceptance Action */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div>
                          {isAccepted ? (
                            <span style={{ color: 'var(--gh-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CheckCircle2 size={18} />
                              <span>Trauma &amp; Cath Lab Team Activated</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--gh-danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                              Action required: Tap "Ready" to alert ambulance driver
                            </span>
                          )}
                        </div>

                        {!isAccepted && !isArrived && (
                          <Button
                            variant="success"
                            size="md"
                            onClick={() => handleAcceptPatient(incident.id)}
                            loading={acceptingId === incident.id}
                            icon={<CheckCircle2 size={18} />}
                          >
                            Ready — Prepare Bay
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── PANEL B: Live Capacity & Status Management ── */}
          <section className="gh-status-panel" aria-labelledby="status-mgmt-title">
            <div className="gh-col-header">
              <div className="gh-col-title" id="status-mgmt-title">
                <Clock size={20} color="var(--gh-accent)" aria-hidden="true" />
                <span>Our Status &amp; Capacity</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--gh-text-muted)', fontStyle: 'italic' }}>
                Updates dispatcher in real time
              </span>
            </div>

            {loadingHospitals || !activeHospital ? (
              <Skeleton height="300px" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. ICU Beds Available Stepper */}
                <div className="gh-bed-stepper">
                  <div>
                    <strong style={{ fontSize: '1rem', color: 'var(--gh-text)' }}>
                      Available ICU Beds
                    </strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gh-text-muted)', marginTop: '2px' }}>
                      Setting to 0 will instantly exclude this hospital from critical triage.
                    </div>
                  </div>

                  <div className="gh-bed-stepper__controls">
                    <button
                      type="button"
                      className="gh-bed-stepper__btn"
                      onClick={() => handleBedsChange(-1)}
                      disabled={updatingField || activeHospital.icu_beds_available <= 0}
                      aria-label="Decrease ICU beds"
                    >
                      −
                    </button>
                    <span className="gh-bed-stepper__number">
                      {activeHospital.icu_beds_available ?? 0}
                    </span>
                    <button
                      type="button"
                      className="gh-bed-stepper__btn"
                      onClick={() => handleBedsChange(1)}
                      disabled={updatingField}
                      aria-label="Increase ICU beds"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 2. Clinical Capabilities Toggles */}
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--gh-text)', display: 'block', marginBottom: '8px' }}>
                    Clinical Facilities &amp; Equipment
                  </strong>
                  <div className="gh-cap-grid">
                    {CAPABILITY_DEFINITIONS.map((cap) => {
                      const isActive = Boolean(activeHospital[cap.key]);
                      return (
                        <button
                          key={cap.key}
                          type="button"
                          className={`gh-cap-toggle-btn ${isActive ? 'gh-cap-toggle-btn--active' : ''}`}
                          onClick={() => handleToggleCapability(cap.key)}
                          disabled={updatingField}
                        >
                          <span>{cap.label}</span>
                          {isActive ? <Check size={16} /> : <X size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Specialists on Duty Roster */}
                <div className="gh-specialists-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--gh-text)' }}>
                      Specialists Currently On Duty
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gh-text-muted)' }}>
                      Affects clinical match bonus
                    </span>
                  </div>

                  <div className="gh-specialists-tags">
                    {Array.isArray(activeHospital.specialists_on_duty) &&
                    activeHospital.specialists_on_duty.length > 0 ? (
                      activeHospital.specialists_on_duty.map((spec) => (
                        <span key={spec} className="gh-specialist-tag">
                          <UserCheck size={14} color="var(--gh-success)" />
                          <span style={{ textTransform: 'capitalize' }}>{spec}</span>
                          <button
                            type="button"
                            className="gh-specialist-remove-btn"
                            onClick={() => handleToggleSpecialist(spec)}
                            title={`Remove ${spec}`}
                            aria-label={`Remove ${spec}`}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--gh-text-muted)', fontStyle: 'italic' }}>
                        No specialists checked in.
                      </span>
                    )}
                  </div>

                  {/* Quick-add suggestions */}
                  <div style={{ borderTop: '1px solid var(--gh-border)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gh-text-muted)', display: 'block', marginBottom: '6px' }}>
                      Quick Check-in:
                    </span>
                    <div className="gh-quick-add-specialists">
                      {PRESET_SPECIALISTS.map((preset) => {
                        const isAlreadyOnDuty =
                          Array.isArray(activeHospital.specialists_on_duty) &&
                          activeHospital.specialists_on_duty.some(
                            (s) => s.toLowerCase() === preset.toLowerCase()
                          );
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleToggleSpecialist(preset)}
                            disabled={updatingField}
                            style={{
                              fontSize: '0.75rem',
                              padding: '3px 8px',
                              borderRadius: 'var(--gh-radius-sm)',
                              border: '1px solid var(--gh-border)',
                              backgroundColor: isAlreadyOnDuty ? 'var(--gh-success-light)' : 'var(--gh-surface)',
                              color: isAlreadyOnDuty ? 'var(--gh-success)' : 'var(--gh-text)',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {isAlreadyOnDuty ? '✓ ' : '+ '}
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Live propagation note */}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--gh-radius-sm)',
                  backgroundColor: 'var(--gh-surface-2)',
                  fontSize: '0.78rem',
                  color: 'var(--gh-text-muted)',
                  border: '1px solid var(--gh-border)',
                  lineHeight: 1.4,
                }}>
                  💡 <strong>Realtime Guarantee:</strong> Changes made here write directly to Firestore and trigger ranking recalculations on the Dispatcher console within milliseconds.
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

export default Hospital;
