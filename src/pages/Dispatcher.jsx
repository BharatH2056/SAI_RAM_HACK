// src/pages/Dispatcher.jsx - Hero Command Center for Dispatchers
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Radio,
  Plus,
  Send,
  ChevronDown,
  ChevronUp,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';

import AppShell from '../components/AppShell.jsx';
import Card from '../components/shared/Card.jsx';
import Button from '../components/shared/Button.jsx';
import Chip from '../components/shared/Chip.jsx';
import BigNumber from '../components/shared/BigNumber.jsx';
import StatusBadge from '../components/shared/StatusBadge.jsx';
import CapabilityTick from '../components/shared/CapabilityTick.jsx';
import Skeleton from '../components/shared/Skeleton.jsx';
import EmptyState from '../components/shared/EmptyState.jsx';
import { useToast } from '../hooks/useToast.js';
import useHospitals from '../hooks/useHospitals.js';
import useIncidents from '../hooks/useIncidents.js';

import DispatcherMap from '../components/dispatcher/DispatcherMap.jsx';
import TimeSavedBar from '../components/dispatcher/TimeSavedBar.jsx';
import IncidentTimeline from '../components/dispatcher/IncidentTimeline.jsx';

import { rankHospitals } from '../services/rankingEngine.js';
import { getRoute } from '../services/routingService.js';
import { calculateTimeSaved } from '../services/timeSavedService.js';
import {
  confirmIncident,
  dispatchIncident,
  createIncident,
  subscribeToIncident,
} from '../services/incidentService.js';
import { EMERGENCY_RULES, getRules } from '../data/emergencyRules.js';
import { DEMO_LOCATION } from '../config/constants.js';

import './Dispatcher.css';

const EMERGENCY_CHIPS = [
  { id: 'heart_attack', label: 'Heart Attack' },
  { id: 'stroke', label: 'Stroke' },
  { id: 'trauma', label: 'Severe Trauma' },
  { id: 'pregnancy', label: 'Obstetric' },
  { id: 'burns', label: 'Severe Burns' },
];

export function Dispatcher() {
  const location = useLocation();
  const { showToast } = useToast();

  // Realtime feeds
  const { hospitals, loading: loadingHospitals } = useHospitals();
  const { incidents, loading: loadingIncidents } = useIncidents([
    'created',
    'confirmed',
    'dispatched',
    'accepted',
    'enroute',
  ]);

  // Active Incident state
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [activeIncidentData, setActiveIncidentData] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);

  // Manual incident form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualType, setManualType] = useState('heart_attack');
  const [manualLocationPreset, setManualLocationPreset] = useState('hebbal');

  // Ranking & routing states
  const [rankingResult, setRankingResult] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [timeSavedBreakdown, setTimeSavedBreakdown] = useState(null);
  const [showExclusions, setShowExclusions] = useState(false);

  // Dispatch commitment modal / loading
  const [dispatchConfirming, setDispatchConfirming] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  // 1. Initial selection from location state or first incident
  useEffect(() => {
    if (location.state?.incidentId) {
      setSelectedIncidentId(location.state.incidentId);
    } else if (!selectedIncidentId && incidents.length > 0) {
      setSelectedIncidentId(incidents[0].id);
    }
  }, [location.state, incidents, selectedIncidentId]);

  // 2. Realtime listener for the currently selected incident
  useEffect(() => {
    if (!selectedIncidentId) {
      setActiveIncidentData(null);
      return;
    }
    const unsub = subscribeToIncident(
      selectedIncidentId,
      (data) => {
        if (data) {
          setActiveIncidentData(data);
        }
      },
      (err) => console.error('[Dispatcher] Error subscribing to incident:', err)
    );
    return () => unsub();
  }, [selectedIncidentId]);

  // Selected incident patient location fallback
  const patientLocation = useMemo(() => {
    if (activeIncidentData?.patientLocation) {
      return activeIncidentData.patientLocation;
    }
    return {
      lat: DEMO_LOCATION.latitude,
      lng: DEMO_LOCATION.longitude,
      label: DEMO_LOCATION.label,
    };
  }, [activeIncidentData]);

  const activeEmergencyType = useMemo(() => {
    return activeIncidentData?.emergencyType || activeIncidentData?.suggestedType || 'heart_attack';
  }, [activeIncidentData]);

  // 3. Re-run ranking whenever hospitals, patientLocation, or emergencyType change
  useEffect(() => {
    if (!hospitals || hospitals.length === 0) return;

    let isCurrent = true;
    setRankingLoading(true);

    rankHospitals({
      emergencyType: activeEmergencyType,
      patientLocation,
      hospitals,
    })
      .then((res) => {
        if (!isCurrent) return;
        setRankingResult(res);

        // Auto-select recommended hospital (#1) if none selected or if previously selected is invalid
        if (res.recommended && res.recommended.length > 0) {
          const rec1 = res.recommended[0].hospital;
          setSelectedHospital((prev) => {
            if (!prev) return rec1;
            const exists = res.recommended.some((r) => r.hospital.id === prev.id);
            return exists ? prev : rec1;
          });
        }
      })
      .catch((err) => {
        if (isCurrent) console.error('[Dispatcher] Ranking error:', err);
      })
      .finally(() => {
        if (isCurrent) setRankingLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [hospitals, activeEmergencyType, patientLocation]);

  // 4. Fetch full route & calculate time saved when selected hospital changes
  useEffect(() => {
    if (!selectedHospital || !rankingResult) {
      setSelectedRoute(null);
      setTimeSavedBreakdown(null);
      return;
    }

    let isCurrent = true;
    const nearest = rankingResult.nearestOverall;

    Promise.all([
      getRoute(patientLocation, selectedHospital),
      nearest ? getRoute(patientLocation, nearest.hospital) : null,
      nearest && nearest.hospital.id !== selectedHospital.id
        ? getRoute(nearest.hospital, selectedHospital)
        : null,
    ])
      .then(([recRoute, nearRoute, transferRoute]) => {
        if (!isCurrent) return;
        setSelectedRoute(recRoute);

        if (nearest) {
          const saved = calculateTimeSaved({
            nearestEta: nearRoute ? nearRoute.etaMinutes : nearest.etaMinutes,
            recommendedEta: recRoute.etaMinutes,
            etaNearestToRecommended: transferRoute ? transferRoute.etaMinutes : 0,
            nearestCanTreat: nearest.canTreat,
          });
          setTimeSavedBreakdown(saved);
        }
      })
      .catch((err) => {
        if (isCurrent) console.error('[Dispatcher] Routing calculation error:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedHospital, rankingResult, patientLocation]);

  // 5. Change emergency type manually
  const handleTypeChange = async (newType) => {
    if (!selectedIncidentId) return;
    try {
      await confirmIncident(selectedIncidentId, newType);
      showToast(`Emergency category confirmed: ${newType}`, 'success', 2500);
    } catch (err) {
      showToast(`Failed to update type: ${err.message}`, 'error', 3000);
    }
  };

  // 6. Manual incident creation
  const handleCreateManual = async (e) => {
    e.preventDefault();
    try {
      let loc = { lat: 13.0358, lng: 77.5970, label: 'Hebbal, Bangalore' };
      if (manualLocationPreset === 'mg_road') {
        loc = { lat: 12.9756, lng: 77.6066, label: 'MG Road, Bangalore' };
      } else if (manualLocationPreset === 'koramangala') {
        loc = { lat: 12.9352, lng: 77.6245, label: 'Koramangala, Bangalore' };
      }

      const newInc = await createIncident({
        source: 'dispatcher',
        transcript: `Manual dispatcher dispatch initiated for ${manualType}`,
        suggestedType: manualType,
        emergencyType: manualType,
        patientLocation: loc,
      });

      setSelectedIncidentId(newInc.id);
      setShowManualForm(false);
      showToast('Manual emergency incident created successfully', 'success', 3000);
    } catch (err) {
      showToast(`Failed to create incident: ${err.message}`, 'error', 4000);
    }
  };

  // 7. Dispatch incident
  const handleCommitDispatch = async () => {
    if (!selectedIncidentId || !selectedHospital) return;

    try {
      setIsDispatching(true);
      setDispatchConfirming(false);

      // Confirm clinical category first if still in 'created'
      if (activeIncidentData?.status === 'created') {
        await confirmIncident(selectedIncidentId, activeEmergencyType);
      }

      // Dispatch with rankedSnapshot and timeSaved calculation
      await dispatchIncident(selectedIncidentId, {
        hospitalId: selectedHospital.id,
        rankedSnapshot: rankingResult?.recommended || [],
        etaMinutes: selectedRoute?.etaMinutes || 10,
        timeSaved: timeSavedBreakdown,
      });

      showToast(`Dispatched to ${selectedHospital.name}! Alert sent to ER desk.`, 'success', 4000);
    } catch (err) {
      console.error('[Dispatcher] Dispatch error:', err);
      showToast(`Dispatch failed: ${err.message}`, 'error', 4000);
    } finally {
      setIsDispatching(false);
    }
  };

  const qualifiedHospitalsList = useMemo(() => {
    return rankingResult?.recommended?.map((r) => r.hospital) || [];
  }, [rankingResult]);

  return (
    <AppShell defaultScreenTheme="dark" title="Dispatcher Command Center">
      <div className="gh-dispatcher-page">
        <div className="gh-dispatcher-layout">
          {/* ── LEFT COLUMN: Incoming Incidents & Manual Triage ── */}
          <aside className="gh-dispatcher-col" aria-label="Incoming Incidents">
            <div className="gh-col-header">
              <div className="gh-col-title">
                <Radio size={18} color="var(--gh-accent)" aria-hidden="true" />
                <span>Active Emergencies ({incidents.length})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManualForm(!showManualForm)}
                icon={<Plus size={14} />}
              >
                {showManualForm ? 'Close' : 'New'}
              </Button>
            </div>

            {/* Manual incident form */}
            {showManualForm && (
              <form className="gh-manual-form" onSubmit={handleCreateManual}>
                <strong style={{ fontSize: '0.85rem' }}>Create Manual Emergency</strong>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--gh-text-muted)' }}>Emergency Category</label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value)}
                  >
                    <option value="heart_attack">Heart Attack (STEMI)</option>
                    <option value="stroke">Acute Stroke / CVA</option>
                    <option value="trauma">Severe Trauma / Accident</option>
                    <option value="pregnancy">Obstetric / Labour</option>
                    <option value="burns">Severe Burns</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--gh-text-muted)' }}>Location Preset</label>
                  <select
                    value={manualLocationPreset}
                    onChange={(e) => setManualLocationPreset(e.target.value)}
                  >
                    <option value="hebbal">Hebbal (Demo Preset - 13.0358, 77.5970)</option>
                    <option value="mg_road">MG Road (Central - 12.9756, 77.6066)</option>
                    <option value="koramangala">Koramangala (South - 12.9352, 77.6245)</option>
                  </select>
                </div>
                <Button type="submit" variant="primary" size="sm" icon={<Plus size={14} />}>
                  Create &amp; Triage
                </Button>
              </form>
            )}

            {/* Incidents feed list */}
            {loadingIncidents ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Skeleton height="80px" />
                <Skeleton height="80px" />
                <Skeleton height="80px" />
              </div>
            ) : incidents.length === 0 ? (
              <EmptyState
                title="No active emergencies"
                description="Use the button above or start the demo from the landing page."
              />
            ) : (
              <div className="gh-incidents-list" role="list">
                {incidents.map((inc) => {
                  const isSelected = inc.id === selectedIncidentId;
                  const rule = getRules(inc.emergencyType || inc.suggestedType);

                  return (
                    <div
                      key={inc.id}
                      className={`gh-incident-item ${isSelected ? 'gh-incident-item--active' : ''}`}
                      onClick={() => setSelectedIncidentId(inc.id)}
                      role="listitem"
                      tabIndex={0}
                    >
                      <div className="gh-incident-item__top">
                        <span className="gh-incident-item__source">
                          {inc.source === 'voice' ? '🎙️ Voice SOS' : '🖥️ Dispatcher'}
                        </span>
                        <StatusBadge status={inc.status} />
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--gh-text)' }}>
                        {rule?.label || inc.emergencyType || 'Emergency Call'}
                      </div>

                      <div className="gh-incident-item__transcript">
                        "{inc.transcript || 'No transcript text available'}"
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--gh-text-muted)' }}>
                        <span>📍 {inc.patientLocation?.label || 'Hebbal'}</span>
                        {inc.suggestedType && (
                          <span style={{ color: 'var(--gh-warning)', fontWeight: 600 }}>
                            AI Suggestion
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected Incident Control Card */}
            {activeIncidentData && (
              <Card style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gh-accent)' }}>
                    Active Incident Control
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gh-text-muted)' }}>
                    ID: {activeIncidentData.id.slice(0, 8)}…
                  </span>
                </div>

                {activeIncidentData.suggestedType && activeIncidentData.status === 'created' && (
                  <div
                    style={{
                      padding: '8px 10px',
                      backgroundColor: 'var(--gh-warning-light)',
                      border: '1px solid var(--gh-warning-border)',
                      borderRadius: 'var(--gh-radius-sm)',
                      fontSize: '0.78rem',
                      color: 'var(--gh-warning)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Info size={14} />
                    <span>Suggested by Voice AI · Needs dispatcher confirmation</span>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gh-text-muted)', marginBottom: '6px' }}>
                    Confirm Emergency Category:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {EMERGENCY_CHIPS.map((chip) => (
                      <Chip
                        key={chip.id}
                        label={chip.label}
                        selected={activeEmergencyType === chip.id}
                        onClick={() => handleTypeChange(chip.id)}
                      />
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </aside>

          {/* ── CENTER COLUMN: Tactical Map & Live Lifelines ── */}
          <main className="gh-dispatcher-col gh-dispatcher-col--center" aria-label="Tactical Map and Status">
            {/* Live Status Lifecycle Banner */}
            <IncidentTimeline status={activeIncidentData?.status || 'created'} />

            {/* Leaflet Tactical Map */}
            <div className="gh-center-map-wrap">
              <DispatcherMap
                patientLocation={patientLocation}
                hospitals={hospitals}
                qualifiedHospitals={qualifiedHospitalsList}
                excludedHospitals={rankingResult?.excluded || []}
                selectedHospital={selectedHospital}
                nearestOverall={rankingResult?.nearestOverall}
                routePolyline={selectedRoute?.geometry || []}
                ambulancePosition={activeIncidentData?.ambulancePosition}
                onSelectHospital={(h) => setSelectedHospital(h)}
              />
            </div>

            {/* Time Saved Comparison Panel */}
            <TimeSavedBar
              timeSaved={timeSavedBreakdown}
              nearestHospital={rankingResult?.nearestOverall?.hospital}
              recommendedHospital={selectedHospital}
            />
          </main>

          {/* ── RIGHT COLUMN: Ranked Hospitals & Commitment ── */}
          <section className="gh-dispatcher-col" aria-label="Clinical Ranking and Hospital Selection">
            <div className="gh-col-header">
              <div className="gh-col-title">
                <Sparkles size={18} color="var(--gh-accent)" aria-hidden="true" />
                <span>Clinical Recommendations</span>
              </div>
              {rankingResult?.etaSource && (
                <span style={{ fontSize: '0.75rem', color: 'var(--gh-text-muted)', fontWeight: 600 }}>
                  [{rankingResult.etaSource === 'osrm' ? 'road route' : 'straight-line'}]
                </span>
              )}
            </div>

            {/* Ranked Hospitals List */}
            {rankingLoading || loadingHospitals ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Skeleton height="120px" />
                <Skeleton height="90px" />
                <Skeleton height="90px" />
              </div>
            ) : !rankingResult || rankingResult.recommended.length === 0 ? (
              <EmptyState
                title="No Qualified Hospitals Found"
                description="No facilities within range meet all clinical capability and bed criteria."
              />
            ) : (
              <div className="gh-ranked-list" role="list">
                {rankingResult.recommended.map((item, idx) => {
                  const h = item.hospital;
                  const isFirst = idx === 0;
                  const isSelected = selectedHospital && selectedHospital.id === h.id;

                  return (
                    <Card
                      key={h.id}
                      recommended={isFirst}
                      selected={isSelected}
                      className="gh-ranked-card"
                      onClick={() => setSelectedHospital(h)}
                      interactive
                      role="listitem"
                    >
                      <div className="gh-ranked-card__header">
                        <div>
                          {isFirst && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'var(--gh-accent)',
                                color: 'var(--gh-text-inverse)',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                marginBottom: '4px',
                              }}
                            >
                              ★ #1 Recommended
                            </span>
                          )}
                          <h3 className="gh-ranked-card__name">{h.name}</h3>
                          <div className="gh-ranked-card__area">{h.area}</div>
                        </div>

                        <BigNumber
                          value={item.etaMinutes}
                          unit="min"
                          label={`${item.distanceKm} km`}
                          colorRole={isFirst ? 'accent' : 'default'}
                          size={isFirst ? 'md' : 'sm'}
                        />
                      </div>

                      {/* Clinical Capabilities Ticks */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        <CapabilityTick label="24/7 ER" present={h.emergency_24x7} />
                        {h.has_cath_lab && <CapabilityTick label="Cath Lab" present={true} />}
                        {h.has_stroke_unit && <CapabilityTick label="Stroke Unit" present={true} />}
                        {h.has_trauma_center && <CapabilityTick label="Trauma Center" present={true} />}
                        <CapabilityTick
                          label={`${h.icu_beds_available} ICU Beds`}
                          present={h.icu_beds_available > 0}
                        />
                      </div>

                      {/* Reasons Tags */}
                      <div className="gh-reasons-list">
                        {item.reasons.map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className={`gh-reason-tag ${isFirst ? 'gh-reason-tag--highlight' : ''}`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>

                      {/* Dispatch button */}
                      <Button
                        variant={isFirst ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHospital(h);
                          setDispatchConfirming(true);
                        }}
                        icon={<Send size={14} />}
                      >
                        Dispatch Here
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Collapsible: Why others were excluded */}
            {rankingResult?.excluded && rankingResult.excluded.length > 0 && (
              <div className="gh-excluded-collapsible">
                <button
                  type="button"
                  className="gh-excluded-trigger"
                  onClick={() => setShowExclusions(!showExclusions)}
                  aria-expanded={showExclusions}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={15} color="var(--gh-danger)" />
                    <span>Why {rankingResult.excluded.length} others were excluded</span>
                  </span>
                  {showExclusions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showExclusions && (
                  <div className="gh-excluded-items">
                    {rankingResult.excluded.map((item) => (
                      <div key={item.hospital.id} className="gh-excluded-row">
                        <div>
                          <strong>{item.hospital.name}</strong>
                          <div style={{ color: 'var(--gh-text-muted)', fontSize: '0.72rem' }}>
                            {item.hospital.area} · {item.distanceKm?.toFixed(1) || '?'} km away
                          </div>
                        </div>
                        <span
                          style={{
                            color: 'var(--gh-danger)',
                            fontWeight: 600,
                            textAlign: 'right',
                            maxWidth: '180px',
                          }}
                        >
                          {item.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ETA Source & Disclaimer Note */}
            <div className="gh-eta-disclaimer-box">
              <div>
                <strong>ETA Source:</strong>{' '}
                {rankingResult?.etaSource === 'osrm'
                  ? 'Real road network routing via OSRM'
                  : 'Straight-line Haversine estimate'}
              </div>
              <div>{rankingResult?.etaDisclaimer || 'Estimated drive time without live traffic'}</div>
            </div>
          </section>
        </div>

        {/* ── CONFIRMATION MODAL BEFORE DISPATCH ── */}
        {dispatchConfirming && selectedHospital && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dispatch-heading"
          >
            <div
              style={{
                backgroundColor: 'var(--gh-surface)',
                border: '2px solid var(--gh-accent)',
                borderRadius: 'var(--gh-radius-lg)',
                padding: '28px',
                maxWidth: '520px',
                width: '100%',
                boxShadow: 'var(--gh-shadow-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <h3 id="confirm-dispatch-heading" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Confirm Emergency Dispatch
              </h3>

              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--gh-surface-2)',
                  borderRadius: 'var(--gh-radius)',
                  border: '1px solid var(--gh-border)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div>
                  <strong>Target Facility:</strong> {selectedHospital.name} ({selectedHospital.area})
                </div>
                <div>
                  <strong>Emergency Category:</strong> {activeEmergencyType}
                </div>
                <div>
                  <strong>Estimated Road ETA:</strong> {selectedRoute?.etaMinutes || 10} minutes (
                  {selectedRoute?.distanceKm || 5} km)
                </div>
                {timeSavedBreakdown?.savedMinutes > 0 && (
                  <div style={{ color: 'var(--gh-accent)', fontWeight: 700 }}>
                    ⚡ Clinical Time Saved: +{timeSavedBreakdown.savedMinutes} minutes vs default routing
                  </div>
                )}
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--gh-text-muted)' }}>
                This will commit the destination in Firestore, alert the hospital emergency desk in real time,
                and notify the responding ambulance unit.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button variant="ghost" onClick={() => setDispatchConfirming(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCommitDispatch}
                  loading={isDispatching}
                  icon={<Send size={16} />}
                >
                  Commit Dispatch &amp; Alert ER
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default Dispatcher;
