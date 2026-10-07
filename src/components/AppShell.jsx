// src/components/AppShell.jsx - Persistent top-level navigation shell (role-aware)
import React, { useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Sun, Moon, Activity, LayoutDashboard, Building2, Truck, PhoneCall,
  LogIn, LogOut, Lock, Home,
} from 'lucide-react';
import useTheme from '../theme/useTheme.js';
import { useAuth } from '../auth/AuthContext.jsx';
import ConnectionStatus from './ConnectionStatus.jsx';
import './AppShell.css';

// All possible nav items, each with the roles that may see them
const ALL_NAV_ITEMS = [
  { to: '/',           label: 'Home',        icon: Home,            roles: null        }, // always shown
  { to: '/dispatcher', label: 'Dispatcher',  icon: LayoutDashboard, roles: ['dispatcher','admin'] },
  { to: '/hospital',   label: 'Hospital ER', icon: Building2,       roles: ['hospital','admin']  },
  { to: '/driver',     label: 'Ambulance',   icon: Truck,           roles: ['driver','admin']    },
  { to: '/sos',        label: 'Patient SOS', icon: PhoneCall,       roles: null        }, // always shown
];

const ROLE_COLOURS = {
  dispatcher: 'var(--gh-accent)',
  hospital:   'var(--gh-success)',
  driver:     'var(--gh-warning)',
  admin:      'var(--gh-danger)',
  unknown:    'var(--gh-muted)',
};

export function AppShell({
  children,
  defaultScreenTheme = null,
  activeLanguage = null,
  onLanguageChange = null,
  title = null,
}) {
  const { theme, toggleTheme, applyScreenDefault } = useTheme();
  const { user, role, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Apply smart screen default if appropriate
  useEffect(() => {
    if (defaultScreenTheme) applyScreenDefault(defaultScreenTheme);
  }, [defaultScreenTheme, applyScreenDefault]);

  // Filter nav items based on current role
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;           // always visible
    if (!user || !role) return false;       // logged out: hide role-specific links
    if (item.roles.includes(role)) return true;
    return false;
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="gh-shell">
      <a href="#gh-main-content" className="gh-skip-link">
        Skip to main content
      </a>

      <header className="gh-header" role="banner">
        <div className="gh-header__container">
          <div className="gh-header__left">
            <Link to="/" className="gh-logo" aria-label="GoldenHour Home">
              <span className="gh-logo__icon" aria-hidden="true">
                <Activity size={18} strokeWidth={2.5} />
              </span>
              <span>
                Golden<span className="gh-logo__text-gold">Hour</span>
              </span>
            </Link>

            {title && (
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--gh-text-muted)',
                  borderLeft: '1px solid var(--gh-border)',
                  paddingLeft: '14px',
                }}
              >
                {title}
              </span>
            )}
          </div>

          <nav className="gh-header__nav" aria-label="Main Navigation">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `gh-nav-link ${isActive ? 'gh-nav-link--active' : ''}`
                  }
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="gh-header__right">
            {/* Language toggle for SOS screen */}
            {activeLanguage && onLanguageChange && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--gh-surface-2)',
                  borderRadius: 'var(--gh-radius-sm)',
                  padding: '2px',
                  border: '1px solid var(--gh-border)',
                }}
                role="group"
                aria-label="Language selector"
              >
                {[
                  { code: 'en', label: 'EN' },
                  { code: 'hi', label: 'हिन्दी' },
                  { code: 'kn', label: 'ಕನ್ನಡ' },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => onLanguageChange(lang.code)}
                    style={{
                      border: 'none',
                      background: activeLanguage === lang.code ? 'var(--gh-accent)' : 'transparent',
                      color: activeLanguage === lang.code ? 'var(--gh-text-inverse)' : 'var(--gh-text-muted)',
                      padding: '4px 8px',
                      borderRadius: 'var(--gh-radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all var(--gh-transition)',
                    }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}

            <ConnectionStatus />

            {/* Logged-in user badge + logout */}
            {!loading && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Role badge */}
                <span
                  title={user.email}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '99px',
                    background: 'var(--gh-surface-2)',
                    border: `1px solid ${ROLE_COLOURS[role] || 'var(--gh-border)'}`,
                    color: ROLE_COLOURS[role] || 'var(--gh-text-muted)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    maxWidth: '100px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'default',
                  }}
                >
                  {role}
                </span>

                {/* Logout button */}
                <button
                  type="button"
                  className="gh-theme-toggle"
                  onClick={handleLogout}
                  aria-label="Log out"
                  title={`Log out (${user.email})`}
                  style={{ color: 'var(--gh-text-muted)' }}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              !loading && (
                <Link
                  to="/login"
                  className="gh-nav-link"
                  style={{ gap: '6px' }}
                  aria-label="Sign in"
                >
                  <LogIn size={16} />
                  <span>Login</span>
                </Link>
              )
            )}

            {/* Theme toggle */}
            <button
              type="button"
              className="gh-theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main id="gh-main-content" className="gh-main" role="main">
        {children}
      </main>
    </div>
  );
}

export default AppShell;
