/**
 * GoldenHour Hospital Seed Script
 * Reads data/goldenhour_hospitals_bangalore.json (25 hospitals)
 * and writes to Firestore collection 'hospitals' in an idempotent batch.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from project root
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Validate environment variables strictly
function validateFirebaseEnv() {
  const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];

  const missing = [];
  const placeholderIssues = [];

  for (const key of requiredKeys) {
    const val = process.env[key];
    if (!val || typeof val !== 'string' || val.trim() === '') {
      missing.push(key);
      continue;
    }

    const cleanVal = val.trim().toLowerCase();
    if (
      cleanVal === 'goldenhour-demo' ||
      cleanVal.includes('your-') ||
      cleanVal.includes('dummy') ||
      cleanVal.includes('placeholder')
    ) {
      placeholderIssues.push(`${key}="${val}"`);
    }
  }

  if (missing.length > 0) {
    console.error('\n[Error] Missing Firebase environment variables in .env:');
    missing.forEach((k) => console.error(`  - ${k}`));
    console.error('Please configure your live Firebase credentials in .env.\n');
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  if (placeholderIssues.length > 0) {
    console.error('\n[Error] Environment variables still have placeholder values in .env:');
    placeholderIssues.forEach((p) => console.error(`  - ${p}`));
    console.error('Please replace placeholders with your actual Firebase project credentials.\n');
    throw new Error(`Placeholder values detected: ${placeholderIssues.join(', ')}`);
  }

  return process.env.VITE_FIREBASE_PROJECT_ID;
}

export async function seedHospitals() {
  console.log('================================================================');
  console.log('            GOLDENHOUR HOSPITAL DATABASE SEEDER                 ');
  console.log('================================================================');

  // 1. Validate environment & print projectId
  const projectId = validateFirebaseEnv();
  console.log(`[Seed] Target Firebase Project ID: "${projectId}"`);

  // Dynamically import Firestore client & Auth after environment validation
  const { ensureAdminAuth } = await import('./authHelper.js');
  await ensureAdminAuth();

  const { doc, writeBatch, serverTimestamp } = await import('firebase/firestore');
  const { db } = await import('../src/config/firebase.js');


  // 2. Read dataset file
  const jsonPath = path.resolve(__dirname, '../data/goldenhour_hospitals_bangalore.json');
  console.log(`[Seed] Loading dataset from ${jsonPath}...`);

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Dataset file not found at ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  let dataset;
  try {
    dataset = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse JSON file at ${jsonPath}: ${err.message}`);
  }

  // Verify structure: { note, city, suggested_demo_patient_location, hospitals: [...] }
  if (!dataset || typeof dataset !== 'object' || !Array.isArray(dataset.hospitals)) {
    throw new Error(
      'Invalid JSON structure: expected top-level object containing a "hospitals" array.'
    );
  }

  const hospitals = dataset.hospitals;
  console.log(`[Seed] Hospitals array loaded. Total found: ${hospitals.length}`);

  // Enforce exactly 25 hospitals requirement
  if (hospitals.length !== 25) {
    throw new Error(
      `Dataset validation failed: Expected exactly 25 hospitals, but found ${hospitals.length}. Aborting seed.`
    );
  }

  // 3. Batch write all 25 hospitals to Firestore
  console.log(`[Seed] Preparing atomic batch write for 25 hospitals into collection 'hospitals'...`);
  const batch = writeBatch(db);

  for (const hospital of hospitals) {
    if (!hospital.id) {
      throw new Error(`Hospital record missing 'id' property: ${JSON.stringify(hospital)}`);
    }

    const docRef = doc(db, 'hospitals', hospital.id);
    batch.set(
      docRef,
      {
        id: hospital.id,
        name: hospital.name,
        area: hospital.area,
        latitude: Number(hospital.latitude),
        longitude: Number(hospital.longitude),
        type: hospital.type || 'General',
        emergency_24x7: Boolean(hospital.emergency_24x7),
        has_cath_lab: Boolean(hospital.has_cath_lab),
        has_stroke_unit: Boolean(hospital.has_stroke_unit),
        has_trauma_center: Boolean(hospital.has_trauma_center),
        has_maternity: Boolean(hospital.has_maternity),
        has_burn_unit: Boolean(hospital.has_burn_unit),
        has_blood_bank: Boolean(hospital.has_blood_bank),
        icu_beds_available: Number(hospital.icu_beds_available ?? 0),
        specialists_on_duty: Array.isArray(hospital.specialists_on_duty)
          ? hospital.specialists_on_duty
          : [],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  console.log(`[Seed] Committing batch write to Firestore (Project: "${projectId}")...`);
  await batch.commit();
  console.log(`[Seed] SUCCESS! Successfully seeded all 25 hospitals to Firestore.\n`);
  return { success: true, count: hospitals.length, projectId };
}

// Direct execution
if (process.argv[1] && process.argv[1].endsWith('seedHospitals.js')) {
  seedHospitals()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] FATAL ERROR:', err.message);
      process.exit(1);
    });
}
