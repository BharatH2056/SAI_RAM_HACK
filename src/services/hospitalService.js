/**
 * Hospital Service
 * Manages hospital data, realtime subscriptions, and bed/specialist status updates.
 */
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

const ALLOWED_BOOLEAN_FLAGS = [
  'emergency_24x7',
  'has_cath_lab',
  'has_stroke_unit',
  'has_trauma_center',
  'has_maternity',
  'has_burn_unit',
  'has_blood_bank',
];

/**
 * Validates partial update fields for a hospital.
 * Only permits icu_beds_available (integer >= 0), boolean flags, and specialists_on_duty (array).
 * @param {Object} partialFields 
 * @returns {Object} Cleaned validated fields
 */
export function validateHospitalUpdate(partialFields) {
  if (!partialFields || typeof partialFields !== 'object' || Array.isArray(partialFields)) {
    throw new Error('Update payload must be a non-null object.');
  }

  const keys = Object.keys(partialFields);
  if (keys.length === 0) {
    throw new Error('Update payload cannot be empty.');
  }

  const allowedKeys = new Set([
    'icu_beds_available',
    'specialists_on_duty',
    ...ALLOWED_BOOLEAN_FLAGS,
  ]);

  const validated = {};

  for (const key of keys) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Unauthorized field in hospital update: "${key}".`);
    }

    const value = partialFields[key];

    if (key === 'icu_beds_available') {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        throw new Error(`"icu_beds_available" must be a non-negative integer. Received: ${value}`);
      }
      validated.icu_beds_available = value;
    } else if (key === 'specialists_on_duty') {
      if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
        throw new Error('"specialists_on_duty" must be an array of strings.');
      }
      validated.specialists_on_duty = value.map((s) => s.trim().toLowerCase());
    } else if (ALLOWED_BOOLEAN_FLAGS.includes(key)) {
      if (typeof value !== 'boolean') {
        throw new Error(`Flag "${key}" must be a boolean. Received: ${typeof value}`);
      }
      validated[key] = value;
    }
  }

  return validated;
}

/**
 * Realtime listener returning all hospitals.
 * @param {Function} callback - Called with array of hospital records
 * @param {Function} [errorCallback] - Optional error handler
 * @returns {Function} Unsubscribe function
 */
export function subscribeToHospitals(callback, errorCallback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback function required for subscribeToHospitals.');
  }

  const hospitalsCol = collection(db, 'hospitals');
  return onSnapshot(
    hospitalsCol,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(list);
    },
    (err) => {
      if (errorCallback) errorCallback(err);
      else console.error('[HospitalService] subscribeToHospitals error:', err);
    }
  );
}

/**
 * Retrieve a single hospital by ID.
 * @param {string} id Hospital Document ID
 * @returns {Promise<Object|null>} Hospital data or null if not found
 */
export async function getHospital(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('Valid hospital ID string required.');
  }

  const docRef = doc(db, 'hospitals', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    return null;
  }
  return { id: snap.id, ...snap.data() };
}

/**
 * Updates dynamic fields for a hospital (beds, flags, specialists).
 * Rejects invalid fields or out-of-range values.
 * @param {string} hospitalId 
 * @param {Object} partialFields 
 * @returns {Promise<Object>} Updated fields
 */
export async function updateHospitalStatus(hospitalId, partialFields) {
  if (!hospitalId || typeof hospitalId !== 'string') {
    throw new Error('Valid hospitalId required.');
  }

  const validated = validateHospitalUpdate(partialFields);
  validated.updatedAt = serverTimestamp();

  const docRef = doc(db, 'hospitals', hospitalId);
  await updateDoc(docRef, validated);

  return validated;
}
