// src/auth/ProtectedRoute.jsx - RBAC route guard for GoldenHour
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Skeleton from '../components/shared/Skeleton.jsx';
import { Button } from '../components/shared/Button.jsx';
import { LogOut, Lock, Home } from 'lucide-react';

/**
 * Wraps a route element with role-based protection.
 *
 * @param {{ allowedRoles: string[], children: React.ReactNode }} props
 *   allowedRoles - list of roles permitted to access this route (e.g. ['dispatcher', 'admin'])
 */
export function ProtectedRoute({ allowedRoles, children }) {
  const { user, role, loading, logout } = useAuth();
  const location = useLocation();

  // --- Loading state: show skeleton ---
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          background: 'var(--gh-bg)',
        }}
      >
        <Skeleton width="200px" height="20px" borderRadius="8px" />
        <Skeleton width="280px" height="14px" borderRadius="6px" />
        <Skeleton width="240px" height="14px" borderRadius="6px" />
      </div>
    );
  }

  // --- Not logged in: redirect to /login, remember current path ---
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // --- Wrong role: friendly access-denied page ---
  const allowed = allowedRoles.includes(role);
  if (!allowed) {
    const needed = allowedRoles.filter(r => r !== 'admin').join(' or ');
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          background: 'var(--gh-bg)',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            background: 'var(--gh-danger-light)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lock size={28} color="var(--gh-danger)" />
        </div>

        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gh-text)', marginBottom: '8px' }}>
            Access Restricted
          </h1>
          <p style={{ color: 'var(--gh-text-muted)', fontSize: '1rem', maxWidth: '380px', lineHeight: 1.6 }}>
            This portal is for <strong>{needed}</strong> accounts only.
            You are logged in as <code style={{ background: 'var(--gh-surface-2)', padding: '2px 6px', borderRadius: '4px' }}>{role}</code>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button variant="ghost" onClick={() => window.location.href = '/'}>
            <Home size={16} style={{ marginRight: '6px' }} />
            Go Home
          </Button>
          <Button variant="danger" onClick={logout}>
            <LogOut size={16} style={{ marginRight: '6px' }} />
            Log Out
          </Button>
        </div>
      </div>
    );
  }

  // --- Allowed ---
  return children;
}

export default ProtectedRoute;
