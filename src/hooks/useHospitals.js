// src/hooks/useHospitals.js - Realtime hospitals hook
import { useState, useEffect } from 'react';
import { subscribeToHospitals } from '../services/hospitalService.js';

export function useHospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    try {
      const unsubscribe = subscribeToHospitals(
        (list) => {
          if (isMounted) {
            setHospitals(list || []);
            setLoading(false);
          }
        },
        (err) => {
          if (isMounted) {
            console.error('[useHospitals] Error loading hospitals:', err);
            setError(err.message || 'Failed to load hospitals');
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
  }, []);

  return { hospitals, loading, error };
}

export default useHospitals;
