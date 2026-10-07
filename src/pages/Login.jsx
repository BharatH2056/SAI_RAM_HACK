// src/pages/Login.jsx - GoldenHour Login Page with demo one-click buttons
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Activity, Eye, EyeOff, AlertCircle, LogIn, Sun, Moon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { DEMO_ACCOUNTS, getHomeForRole } from '../config/roles.js';
import { Button } from '../components/shared/Button.jsx';
import useTheme from '../theme/useTheme.js';
import '../styles/tokens.css';
import './Login.css';

// Safe reader for VITE_DEMO_PASSWORD
function getDemoPassword() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_DEMO_PASSWORD || '';
  }
  return '';
}

const ROLE_BADGE = {
  dispatcher: 'dispatcher',
  hospital:   'hospital',
  driver:     'driver',
  admin:      'dispatcher',
};

export function Login() {
  const { user, role, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  // Where to go after a successful login
  const from = location.state?.from?.pathname || null;

  // If already logged in, redirect immediately
  useEffect(() => {
    if (!loading && user && role) {
      navigate(from || getHomeForRole(role), { replace: true });
    }
  }, [loading, user, role, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // onAuthStateChanged will update role → useEffect above will redirect
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail) => {
    const demoPassword = getDemoPassword();
    if (!demoPassword) {
      setError('VITE_DEMO_PASSWORD is not set in .env – add it and restart the dev server.');
      return;
    }
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setSubmitting(true);
    try {
      await login(demoEmail, demoPassword);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gh-login-page" data-theme={theme}>
      {/* Brand */}
      <Link to="/" className="gh-login__brand">
        <span className="gh-login__brand-icon"><Activity size={24} strokeWidth={2.5} /></span>
        <span className="gh-login__brand-name">Golden<span>Hour</span></span>
      </Link>

      {/* Login card */}
      <div className="gh-login__card">
        <h1 className="gh-login__title">Sign in to GoldenHour</h1>
        <p className="gh-login__subtitle">Emergency dispatch coordination platform</p>

        <form className="gh-login__form" onSubmit={handleSubmit} noValidate>
          <div className="gh-login__field">
            <label className="gh-login__label" htmlFor="gh-email">Email</label>
            <div className="gh-login__input-wrap">
              <input
                id="gh-email"
                className="gh-login__input"
                type="email"
                autoComplete="email"
                placeholder="you@goldenhour.demo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="gh-login__field">
            <label className="gh-login__label" htmlFor="gh-password">Password</label>
            <div className="gh-login__input-wrap">
              <input
                id="gh-password"
                className="gh-login__input"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
              />
              <button
                type="button"
                className="gh-login__pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="gh-login__error" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={submitting || !email || !password}
            className="gh-login__submit"
          >
            <LogIn size={16} style={{ marginRight: '6px' }} />
            Sign In
          </Button>
        </form>
      </div>

      {/* Demo accounts panel */}
      <div className="gh-login__demo-card">
        <div className="gh-login__demo-title">Demo Accounts</div>
        <div className="gh-login__demo-note">
          Demo only: production would not expose these credentials.
        </div>
        <div className="gh-login__demo-buttons">
          {DEMO_ACCOUNTS.map((acct) => (
            <button
              key={acct.email}
              className="gh-login__demo-btn"
              type="button"
              disabled={submitting}
              onClick={() => handleDemoLogin(acct.email)}
              aria-label={`${acct.label} (${acct.email})`}
            >
              <span>{acct.label}</span>
              <span className={`gh-login__demo-badge gh-login__demo-badge--${ROLE_BADGE[acct.role] || 'dispatcher'}`}>
                {acct.role}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme toggle */}
      <div className="gh-login__theme-row">
        <button
          type="button"
          className="gh-theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
}

// Convert Firebase error codes to human-readable messages
function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password. Please check your credentials and try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment before trying again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact an administrator.';
    default:
      return `Sign-in error (${code}). Please try again.`;
  }
}

export default Login;
