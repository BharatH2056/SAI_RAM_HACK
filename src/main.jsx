// src/main.jsx - GoldenHour Application Entry Point
if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
  window.process = {
    env: {},
    platform: 'browser',
    version: '',
    versions: {},
    nextTick: (fn) => setTimeout(fn, 0),
  };
}

import './styles/tokens.css';
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import { ToastProvider } from './components/shared/Toast.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Lazy-loaded pages
const Landing    = lazy(() => import('./pages/Landing.jsx'));
const Login      = lazy(() => import('./pages/Login.jsx'));
const Dispatcher = lazy(() => import('./pages/Dispatcher.jsx'));
const Hospital   = lazy(() => import('./pages/Hospital.jsx'));
const Driver     = lazy(() => import('./pages/Driver.jsx'));
const SOS        = lazy(() => import('./pages/SOS.jsx'));

function LoadingFallback() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        color: 'var(--gh-text-muted)',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--gh-border)',
          borderTopColor: 'var(--gh-accent)',
          borderRadius: '50%',
          animation: 'gh-spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading GoldenHour…</span>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/"      element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/sos"   element={<SOS />} />

                  {/* Protected routes */}
                  <Route
                    path="/dispatcher"
                    element={
                      <ProtectedRoute allowedRoles={['dispatcher', 'admin']}>
                        <Dispatcher />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/hospital"
                    element={
                      <ProtectedRoute allowedRoles={['hospital', 'admin']}>
                        <Hospital />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/driver"
                    element={
                      <ProtectedRoute allowedRoles={['driver', 'admin']}>
                        <Driver />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
