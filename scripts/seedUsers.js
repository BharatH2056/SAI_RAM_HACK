/**
 * GoldenHour User Seed Script
 * Creates all demo user accounts using Firebase Client Auth createUserWithEmailAndPassword.
 * Idempotent: skips if account already exists.
 * Prints summary table at the end.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEMO_USERS = [
  { email: 'dispatcher@goldenhour.demo', role: 'dispatcher', hospitalId: '-' },
  { email: 'driver@goldenhour.demo', role: 'driver', hospitalId: '-' },
  { email: 'admin@goldenhour.demo', role: 'admin', hospitalId: '-' },
  { email: 'ramaiah@goldenhour.demo', role: 'hospital', hospitalId: 'H23' },
  { email: 'fortis.cunningham@goldenhour.demo', role: 'hospital', hospitalId: 'H08' },
  { email: 'aster@goldenhour.demo', role: 'hospital', hospitalId: 'H11' },
];

async function seedUsers() {
  console.log('================================================================');
  console.log('            GOLDENHOUR USER AUTH SEEDER                        ');
  console.log('================================================================');

  const password = process.env.VITE_DEMO_PASSWORD;
  if (!password || password.trim().length < 6) {
    console.error('\n[Error] VITE_DEMO_PASSWORD must be at least 6 characters in .env.');
    process.exit(1);
  }

  const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth');
  const { auth } = await import('../src/config/firebase.js');

  const results = [];

  for (const user of DEMO_USERS) {
    try {
      await createUserWithEmailAndPassword(auth, user.email, password);
      console.log(`[Created] ${user.email} (${user.role})`);
      results.push({ ...user, status: 'Created' });
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        console.log(`[Exists]  ${user.email} (already provisioned)`);
        results.push({ ...user, status: 'Existing' });
      } else {
        console.error(`[Failed]  ${user.email}: ${err.message}`);
        results.push({ ...user, status: `Error: ${err.code}` });
      }
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log('DEMO ACCOUNTS PROVISIONING SUMMARY:');
  console.log('----------------------------------------------------------------');
  console.table(results);
  console.log('================================================================\n');
}

seedUsers().catch((err) => {
  console.error('[SeedUsers Fatal Error]:', err);
  process.exit(1);
});
