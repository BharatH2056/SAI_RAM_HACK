// src/auth/AuthContext.jsx - Firebase Auth context for GoldenHour RBAC
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../config/firebase.js';
import { getRoleForEmail } from '../config/roles.js';

const AuthContext = createContext(null);

/**
 * Provides auth state, role, hospitalId, login and logout to the entire app.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [hospitalId, setHospitalId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const { role: r, hospitalId: hid } = getRoleForEmail(firebaseUser.email);
        setUser(firebaseUser);
        setRole(r);
        setHospitalId(hid);
      } else {
        setUser(null);
        setRole(null);
        setHospitalId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Sign in with email + password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<import('firebase/auth').UserCredential>}
   */
  const login = useCallback(async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  /**
   * Sign out the current user.
   * @returns {Promise<void>}
   */
  const logout = useCallback(async () => {
    return signOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, hospitalId, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context. Must be called inside AuthProvider.
 * @returns {{ user: import('firebase/auth').User|null, role: string|null, hospitalId: string|null, loading: boolean, login: Function, logout: Function }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;
