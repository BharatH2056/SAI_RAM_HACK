// src/hooks/useIncidents.js - Realtime incidents hook by status filter
import { useState, useEffect, useMemo } from 'react';
import { subscribeToIncidentsByStatus } from '../services/incidentService.js';

export function useIncidents(statuses = ['created', 'confirmed']) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stabilize status array dependency
  const statusKey = useMemo(() => statuses.sort().join(','), [statuses]);

  useEffect(() => {
    let isMounted = true;
    if (!statuses || statuses.length === 0) {
      setIncidents([]);
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = subscribeToIncidentsByStatus(
        statuses,
        (list) => {
          if (isMounted) {
            // Sort newest first
            const sorted = [...(list || [])].sort((a, b) => {
              const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.createdAt || 0;
              const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.createdAt || 0;
              return bTime - aTime;
            });
            setIncidents(sorted);
            setLoading(false);
          }
        },
        (err) => {
          if (isMounted) {
            console.error('[useIncidents] Error:', err);
            setError(err.message || 'Failed to load incidents');
            setLoading(false);
          }
        }
      );

      return () => {
        isMounted = false;
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch (err) {
      if (isMounted) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [statusKey]);

  return { incidents, loading, error };
}

export default useIncidents;
