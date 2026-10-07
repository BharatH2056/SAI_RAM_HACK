// src/pages/Driver.jsx - Ambulance Driver Glance-and-Go Navigation
import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Navigation,
  MapPin,
  Play,
  CheckCircle,
  ExternalLink,
  ShieldAlert,
  Clock,
  Sparkles,
} from 'lucide-react';

import AppShell from '../components/AppShell.jsx';
import Button from '../components/shared/Button.jsx';
import StatusBadge from '../components/shared/StatusBadge.jsx';
import BigNumber from '../components/shared/BigNumber.jsx';
import Skeleton from '../components/shared/Skeleton.jsx';
import GoldenHourRing from '../components/hospital/GoldenHourRing.jsx';
import { useToast } from '../hooks/useToast.js';
import useIncidents from '../hooks/useIncidents.js';
import useHospitals from '../hooks/useHospitals.js';

import {
  startTrip,
  markArrived,
  subscribeToIncident,
} from '../services/incidentService.js';
import {
  startSimulation,
  stopSimulation,
  isSimulationActive,
} from '../services/ambulanceSimulator.js';
import { getRoute } from '../services/routingService.js';
import { getRules } from '../data/emergencyRules.js';

import './Driver.css';

export function Driver() {
  const { showToast } = useToast();
  const { hospitals } = useHospitals();
  // Filter for dispatched, accepted, or enroute incidents
  const { incidents, loading: loadingIncidents } = useIncidents([
    'dispatched',
    'accepted',
    'enroute',
  ]);

  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [activeIncident, setActiveIncident] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);

  // Auto-select the first available dispatched incident
  useEffect(() => {
    if (incidents && incidents.length > 0) {
      if (!selectedIncidentId || !incidents.some((i) => i.id === selectedIncidentId)) {
        setSelectedIncidentId(incidents[0].id);
      }
    } else {
      setSelectedIncidentId(null);
      setActiveIncident(null);
    }
  }, [incidents, selectedIncidentId]);

  // Realtime subscription to the selected incident
  useEffect(() => {
    if (!selectedIncidentId) return;

    const unsub = subscribeToIncident(
      selectedIncidentId,
      (data) => {
        if (data) {
          setActiveIncident(data);
          setIsSimulating(isSimulationActive(selectedIncidentId));
        }
      },
      (err) => console.error('[Driver] Incident subscription error:', err)
    );

    return () => unsub();
  }, [selectedIncidentId]);

  // Lookup target hospital details
  const targetHospital = useMemo(() => {
    if (!activeIncident?.selectedHospitalId || !hospitals) return null;
    return hospitals.find((h) => h.id === activeIncident.selectedHospitalId);
  }, [activeIncident, hospitals]);

  const emergencyRule = useMemo(() => {
    return getRules(activeIncident?.emergencyType);
  }, [activeIncident]);

  // Handler: Start Trip + Ambulance Simulation
  const handleStartTrip = async () => {
    if (!activeIncident || !targetHospital) return;

    try {
      showToast('Starting navigation and en route response…', 'info', 2000);

      // Transition incident to 'enroute'
      await startTrip(activeIncident.id, {
        lat: activeIncident.patientLocation?.lat || 13.0358,
        lng: activeIncident.patientLocation?.lng || 77.5970,
      });

      // Fetch route geometry for simulator
      const route = await getRoute(
        activeIncident.patientLocation || { lat: 13.0358, lng: 77.5970 },
        targetHospital
      );

      const geometry = route.geometry || [
        [activeIncident.patientLocation?.lat || 13.0358, activeIncident.patientLocation?.lng || 77.5970],
        [targetHospital.latitude, targetHospital.longitude],
      ];

      // Start virtual simulation at 6x speed
      startSimulation(activeIncident.id, geometry, 6, {
        onPositionUpdate: (pos, curr, total) => {
          setSimProgress(Math.round((curr / total) * 100));
        },
        onComplete: () => {
          setIsSimulating(false);
          setSimProgress(100);
          showToast('Ambulance arrived at hospital emergency bay!', 'success', 4000);
        },
      });

      setIsSimulating(true);
      showToast('En route: live GPS telemetry broadcasting to Dispatcher map', 'success', 3000);
    } catch (err) {
      console.error('[Driver] Start trip error:', err);
      showToast(`Error: ${err.message}`, 'error', 4000);
    }
  };

  // Handler: Mark Arrived immediately
  const handleMarkArrived = async () => {
    if (!activeIncident) return;
    try {
      stopSimulation(activeIncident.id);
      setIsSimulating(false);
      await markArrived(activeIncident.id);
      showToast('Marked arrived! ER trauma team taking over patient.', 'success', 4000);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error', 3500);
    }
  };

  // Google Maps External Turn-by-Turn URL
  const googleMapsUrl = useMemo(() => {
    if (!targetHospital) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${targetHospital.latitude},${targetHospital.longitude}&travelmode=driving`;
  }, [targetHospital]);

  return (
    <AppShell title="Ambulance Response Unit">
      <div className="gh-driver-page">
        {loadingIncidents ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Skeleton height="320px" borderRadius="var(--gh-radius-lg)" />
          </div>
        ) : !activeIncident || !targetHospital ? (
          /* Waiting for Dispatch Empty State */
          <div className="gh-driver-waiting">
            <div className="gh-driver-pulse-icon">
              <Truck size={42} strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gh-text)' }}>
                Standing By for Emergency Dispatch
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--gh-text-muted)', maxWidth: '380px', marginTop: '6px' }}>
                Your unit is active on the network. As soon as a dispatcher commits a route, your verified destination will appear here.
              </p>
            </div>
          </div>
        ) : (
          /* Active Dispatched Mission Card */
          <div className="gh-driver-card">
            <div className="gh-driver-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>🚨</span>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--gh-text)' }}>
                  {emergencyRule?.label || activeIncident.emergencyType}
                </span>
              </div>
              <StatusBadge status={activeIncident.status} />
            </div>

            {/* Destination Highlight */}
            <div className="gh-driver-destination">
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gh-accent)', textTransform: 'uppercase' }}>
                TARGET HOSPITAL · VERIFIED CAPABLE
              </span>
              <h1 className="gh-driver-destination__name">{targetHospital.name}</h1>
              <div className="gh-driver-destination__area">
                📍 {targetHospital.area} · {targetHospital.icu_beds_available} ICU Beds Free
              </div>
            </div>

            {/* Signature Countdown Ring */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoldenHourRing
                initialMinutes={activeIncident.etaMinutes || 10}
                size={160}
                strokeWidth={8}
                label="Minutes ETA"
              />
            </div>

            {/* Telemetry Progress if Simulating */}
            {isSimulating && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--gh-accent)' }}>Live GPS Simulation Broadcast</span>
                  <span>{simProgress}% to ER Bay</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--gh-surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${simProgress}%`,
                      backgroundColor: 'var(--gh-accent)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Large Glance-and-Go Action Buttons */}
            <div className="gh-driver-actions">
              {/* Giant Navigate button to Google Maps */}
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="gh-driver-btn-nav"
                aria-label={`Open Google Maps directions to ${targetHospital.name}`}
              >
                <Navigation size={26} strokeWidth={2.5} />
                <span>Navigate in Google Maps</span>
                <ExternalLink size={18} />
              </a>

              {/* Start Trip / Arrived Controls */}
              {activeIncident.status !== 'enroute' && activeIncident.status !== 'arrived' ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartTrip}
                  icon={<Play size={20} />}
                >
                  Start Trip &amp; Broadcast GPS
                </Button>
              ) : activeIncident.status === 'enroute' ? (
                <Button
                  variant="success"
                  size="lg"
                  onClick={handleMarkArrived}
                  icon={<CheckCircle size={20} />}
                >
                  Arrived at Hospital Bay
                </Button>
              ) : (
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--gh-radius)',
                  backgroundColor: 'var(--gh-success-light)',
                  color: 'var(--gh-success)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle size={20} />
                  <span>Mission Complete · Patient Transferred</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default Driver;
