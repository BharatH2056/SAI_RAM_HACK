/**
 * GoldenHour Scripts Auth Helper
 * Signs in as admin@goldenhour.demo using VITE_DEMO_PASSWORD via Firebase Client Auth.
 * Used by seedHospitals.js, resetDemo.js, realtime-check.js, and any script writing to Firestore.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ADMIN_EMAIL = 'admin@goldenhour.demo';

/**
 * Ensures the script is authenticated as admin in Firebase Client Auth.
 * Fails fast with a clear diagnostic message if authentication fails.
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function ensureAdminAuth() {
  const password = process.env.VITE_DEMO_PASSWORD;
  if (!password || password.trim() === '') {
    console.error('\n[AuthHelper Error] VITE_DEMO_PASSWORD is not set in .env.');
    console.error('Please configure VITE_DEMO_PASSWORD in your .env file (min 6 characters).\n');
    throw new Error('VITE_DEMO_PASSWORD is required for script authentication.');
  }

  const { signInWithEmailAndPassword } = await import('firebase/auth');
  const { auth } = await import('../src/config/firebase.js');

  try {
    const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
    console.log(`[AuthHelper] Successfully authenticated script as ${ADMIN_EMAIL}`);
    return userCredential;
  } catch (err) {
    console.error(`\n[AuthHelper Error] Failed to sign in as ${ADMIN_EMAIL}: ${err.message}`);
    console.error('Make sure you have seeded demo accounts via `npm run seed-users` first!\n');
    throw new Error(`Admin authentication failed: ${err.message}`);
  }
}
