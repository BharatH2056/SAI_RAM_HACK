// src/components/dispatcher/DispatcherMap.jsx - Interactive tactical dispatch map
import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from '../../theme/useTheme.js';
import './DispatcherMap.css';

// Free OpenStreetMap Tile URL (no API key required)
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Component to smoothly pan map when primary target or route changes
function MapRecenter({ center, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch (e) {
        // Safe fallback
      }
    } else if (center) {
      map.setView(center, 12, { animate: true });
    }
  }, [center, bounds, map]);
  return null;
}

export function DispatcherMap({
  patientLocation = { lat: 13.0358, lng: 77.5970, label: 'Hebbal, Bangalore' },
  hospitals = [],
  qualifiedHospitals = [],
  excludedHospitals = [],
  selectedHospital = null,
  nearestOverall = null,
  routePolyline = [],
  ambulancePosition = null,
  onSelectHospital,
}) {
  const { theme } = useTheme();

  const patientCoords = useMemo(() => [
    patientLocation?.lat ?? patientLocation?.latitude ?? 13.0358,
    patientLocation?.lng ?? patientLocation?.longitude ?? 77.5970,
  ], [patientLocation]);

  // Lookup map of exclusion reasons
  const exclusionMap = useMemo(() => {
    const map = new Map();
    excludedHospitals.forEach((item) => {
      map.set(item.hospital.id, item.reason);
    });
    return map;
  }, [excludedHospitals]);

  const qualifiedSet = useMemo(() => {
    return new Set(qualifiedHospitals.map((h) => h.id || h.hospital?.id));
  }, [qualifiedHospitals]);

  // Custom Div Icons
  const patientIcon = useMemo(() => {
    return L.divIcon({
      className: 'gh-marker-container',
      html: `
        <div class="gh-marker-patient" title="Patient Location">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
  }, []);

  const ambulanceIcon = useMemo(() => {
    return L.divIcon({
      className: 'gh-marker-container',
      html: `
        <div class="gh-marker-ambulance" title="Ambulance en route">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }, []);

  // Helper to construct hospital icon based on status
  const getHospitalIcon = (h) => {
    const isSelected = selectedHospital && selectedHospital.id === h.id;
    const isNearest = nearestOverall && nearestOverall.hospital?.id === h.id;
    const isQualified = qualifiedSet.has(h.id);
    const exclusionReason = exclusionMap.get(h.id);
    const isIcuFull = exclusionReason && exclusionReason.includes('ICU full');

    if (isNearest && !nearestOverall?.canTreat) {
      return L.divIcon({
        className: 'gh-marker-container',
        html: `
          <div class="gh-marker-nearest-warning" title="${h.name} - Nearest (Cannot Treat)">
            <span class="gh-nearest-badge-label">Nearest: Cannot Treat</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
    }

    let cssClass = 'gh-marker-hospital';
    let iconSvg = '+';

    if (isSelected) {
      cssClass += ' gh-marker-hospital--selected';
      iconSvg = '★';
    } else if (isQualified) {
      cssClass += ' gh-marker-hospital--qualified';
      iconSvg = '✓';
    } else if (isIcuFull) {
      cssClass += ' gh-marker-hospital--icu-full';
      iconSvg = '0';
    } else {
      cssClass += ' gh-marker-hospital--cannot-treat';
      iconSvg = '✕';
    }

    return L.divIcon({
      className: 'gh-marker-container',
      html: `<div class="${cssClass}" title="${h.name}">${iconSvg}</div>`,
      iconSize: isSelected ? [38, 38] : [32, 32],
      iconAnchor: isSelected ? [19, 19] : [16, 16],
    });
  };

  // Compute map bounds to fit patient and selected hospital
  const bounds = useMemo(() => {
    if (!selectedHospital) return null;
    return [
      patientCoords,
      [selectedHospital.latitude, selectedHospital.longitude],
    ];
  }, [patientCoords, selectedHospital]);

  return (
    <div className="gh-map-container" role="region" aria-label="Tactical Emergency Dispatch Map">
      <MapContainer
        center={patientCoords}
        zoom={12}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          key={theme}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={TILE_URL}
          maxZoom={19}
          className={theme === 'dark' ? 'gh-tiles-dark' : ''}
        />

        <MapRecenter center={patientCoords} bounds={bounds} />

        {/* Patient Location Marker */}
        <Marker position={patientCoords} icon={patientIcon}>
          <Popup>
            <div style={{ padding: '4px' }}>
              <strong style={{ color: 'var(--gh-danger)', display: 'block', marginBottom: '2px' }}>
                🚨 Patient SOS Location
              </strong>
              <span>{patientLocation.label || 'Emergency Location'}</span>
              <div style={{ fontSize: '0.78rem', color: 'var(--gh-text-muted)', marginTop: '4px' }}>
                {patientCoords[0].toFixed(4)}, {patientCoords[1].toFixed(4)}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Live Moving Ambulance Marker */}
        {ambulancePosition && ambulancePosition.lat && ambulancePosition.lng && (
          <Marker
            position={[ambulancePosition.lat, ambulancePosition.lng]}
            icon={ambulanceIcon}
          >
            <Popup>
              <div style={{ padding: '4px' }}>
                <strong>🚑 Ambulance En Route</strong>
                <div>GPS tracking active</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline to Selected Hospital */}
        {routePolyline && routePolyline.length > 0 && (
          <Polyline
            positions={routePolyline}
            pathOptions={{
              color: 'var(--gh-accent)',
              weight: 5,
              opacity: 0.9,
              dashArray: '2, 6',
            }}
          />
        )}

        {/* All Hospital Markers */}
        {hospitals.map((h) => {
          const isSelected = selectedHospital && selectedHospital.id === h.id;
          const isQualified = qualifiedSet.has(h.id);
          const exclusionReason = exclusionMap.get(h.id);
          const isNearest = nearestOverall && nearestOverall.hospital?.id === h.id;

          return (
            <Marker
              key={h.id}
              position={[h.latitude, h.longitude]}
              icon={getHospitalIcon(h)}
              eventHandlers={{
                click: () => onSelectHospital && onSelectHospital(h),
              }}
            >
              <Popup>
                <div style={{ minWidth: '180px', padding: '4px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>
                    {h.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gh-text-muted)', marginBottom: '6px' }}>
                    {h.area}
                  </div>

                  {isNearest && (
                    <div style={{
                      backgroundColor: nearestOverall.canTreat ? 'var(--gh-success-light)' : 'var(--gh-danger-light)',
                      color: nearestOverall.canTreat ? 'var(--gh-success)' : 'var(--gh-danger)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      marginBottom: '6px'
                    }}>
                      {nearestOverall.canTreat ? '✓ Geographically Nearest (Can Treat)' : '⚠ Geographically Nearest (CANNOT TREAT)'}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                    <div>
                      <strong>ICU Beds:</strong>{' '}
                      <span style={{ fontWeight: 700, color: h.icu_beds_available > 0 ? 'var(--gh-success)' : 'var(--gh-danger)' }}>
                        {h.icu_beds_available}
                      </span>
                    </div>

                    {isQualified ? (
                      <span style={{ color: 'var(--gh-success)', fontWeight: 600 }}>✓ Clinically Qualified</span>
                    ) : (
                      <span style={{ color: 'var(--gh-danger)', fontWeight: 600 }}>
                        ✗ Excluded: {exclusionReason || 'Missing capability'}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectHospital && onSelectHospital(h)}
                    style={{
                      marginTop: '8px',
                      width: '100%',
                      padding: '6px 10px',
                      background: isSelected ? 'var(--gh-accent)' : 'var(--gh-surface-2)',
                      color: isSelected ? '#ffffff' : 'var(--gh-text)',
                      border: '1px solid var(--gh-border)',
                      borderRadius: 'var(--gh-radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}
                  >
                    {isSelected ? 'Selected Destination' : 'View Hospital Details'}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Tactical Legend */}
      <div className="gh-map-legend" aria-hidden="true">
        <div className="gh-legend-item">
          <span className="gh-legend-dot" style={{ backgroundColor: 'var(--gh-success)' }} />
          <span>Qualified &amp; Ready</span>
        </div>
        <div className="gh-legend-item">
          <span className="gh-legend-dot" style={{ backgroundColor: 'var(--gh-danger)' }} />
          <span>Cannot Treat (Lacks Capability)</span>
        </div>
        <div className="gh-legend-item">
          <span className="gh-legend-dot" style={{ backgroundColor: 'var(--gh-muted)' }} />
          <span>ICU Full (0 Beds)</span>
        </div>
        <div className="gh-legend-item">
          <span className="gh-legend-dot" style={{ backgroundColor: 'var(--gh-accent)' }} />
          <span>Selected / Recommended</span>
        </div>
      </div>
    </div>
  );
}

export default DispatcherMap;
