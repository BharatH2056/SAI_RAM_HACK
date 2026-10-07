import { describe, it, expect } from 'vitest';
import { getRoleForEmail, getHomeForRole, EMAIL_ROLE_MAP, DEMO_ACCOUNTS } from '../config/roles.js';

describe('Roles & Access Control Configuration', () => {
  describe('getRoleForEmail', () => {
    it('correctly maps dispatcher@goldenhour.demo to dispatcher', () => {
      const res = getRoleForEmail('dispatcher@goldenhour.demo');
      expect(res.role).toBe('dispatcher');
      expect(res.hospitalId).toBeNull();
    });

    it('correctly maps driver@goldenhour.demo to driver', () => {
      const res = getRoleForEmail('driver@goldenhour.demo');
      expect(res.role).toBe('driver');
      expect(res.hospitalId).toBeNull();
    });

    it('correctly maps admin@goldenhour.demo to admin', () => {
      const res = getRoleForEmail('admin@goldenhour.demo');
      expect(res.role).toBe('admin');
      expect(res.hospitalId).toBeNull();
    });

    it('correctly maps Ramaiah Memorial Hospital account to H23', () => {
      const res = getRoleForEmail('ramaiah@goldenhour.demo');
      expect(res.role).toBe('hospital');
      expect(res.hospitalId).toBe('H23');
    });

    it('correctly maps Fortis Cunningham Road account to H08', () => {
      const res = getRoleForEmail('fortis.cunningham@goldenhour.demo');
      expect(res.role).toBe('hospital');
      expect(res.hospitalId).toBe('H08');
    });

    it('correctly maps Aster CMI Hospital account to H11', () => {
      const res = getRoleForEmail('aster@goldenhour.demo');
      expect(res.role).toBe('hospital');
      expect(res.hospitalId).toBe('H11');
    });

    it('handles mixed case and trailing whitespace safely', () => {
      const res = getRoleForEmail('  RAMAIAH@GoldenHour.Demo  ');
      expect(res.role).toBe('hospital');
      expect(res.hospitalId).toBe('H23');
    });

    it('returns unknown role and null hospitalId for unregistered email', () => {
      const res = getRoleForEmail('intruder@example.com');
      expect(res.role).toBe('unknown');
      expect(res.hospitalId).toBeNull();
    });

    it('handles null and undefined gracefully', () => {
      expect(getRoleForEmail(null)).toEqual({ role: 'unknown', hospitalId: null });
      expect(getRoleForEmail(undefined)).toEqual({ role: 'unknown', hospitalId: null });
      expect(getRoleForEmail('')).toEqual({ role: 'unknown', hospitalId: null });
    });
  });

  describe('getHomeForRole', () => {
    it('routes dispatcher to /dispatcher', () => {
      expect(getHomeForRole('dispatcher')).toBe('/dispatcher');
    });

    it('routes hospital to /hospital', () => {
      expect(getHomeForRole('hospital')).toBe('/hospital');
    });

    it('routes driver to /driver', () => {
      expect(getHomeForRole('driver')).toBe('/driver');
    });

    it('routes admin to /dispatcher', () => {
      expect(getHomeForRole('admin')).toBe('/dispatcher');
    });

    it('falls back to / for unknown roles', () => {
      expect(getHomeForRole('unknown')).toBe('/');
    });
  });

  describe('DEMO_ACCOUNTS and EMAIL_ROLE_MAP consistency', () => {
    it('ensures every demo account in DEMO_ACCOUNTS exists in EMAIL_ROLE_MAP', () => {
      for (const account of DEMO_ACCOUNTS) {
        expect(EMAIL_ROLE_MAP[account.email]).toBeDefined();
        expect(EMAIL_ROLE_MAP[account.email].role).toBe(account.role);
        if (account.hospitalId) {
          expect(EMAIL_ROLE_MAP[account.email].hospitalId).toBe(account.hospitalId);
        }
      }
    });
  });
});
