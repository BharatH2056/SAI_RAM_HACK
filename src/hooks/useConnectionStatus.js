// src/hooks/useConnectionStatus.js - Live connection health indicator
import { useState, useEffect } from 'react';

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Heartbeat check every 10s
    const timer = setInterval(() => {
      setLastHeartbeat(Date.now());
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timer);
    };
  }, []);

  return {
    status: isOnline ? 'live' : 'reconnecting',
    isLive: isOnline,
    lastHeartbeat,
  };
}

export default useConnectionStatus;
