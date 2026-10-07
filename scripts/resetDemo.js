/**
 * GoldenHour Reset Demo Script
 * Restores original hospital capabilities/bed counts from the 25-hospital dataset
 * and removes all test incidents.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

export async function resetDemo() {
  console.log('[Reset-Demo] Starting demo state reset...');
  const { ensureAdminAuth } = await import('./authHelper.js');
  await ensureAdminAuth();

  const { collection, getDocs, doc, writeBatch, deleteDoc, serverTimestamp } = await import(
    'firebase/firestore'
  );
  const { db } = await import('../src/config/firebase.js');


  const jsonPath = path.resolve(__dirname, '../data/goldenhour_hospitals_bangalore.json');
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const dataset = JSON.parse(raw);
  const hospitals = dataset.hospitals || dataset;

  try {
    // 1. Reset Hospitals to original seed data
    console.log(`[Reset-Demo] Restoring bed counts and flags for ${hospitals.length} hospitals...`);
    const hospitalBatch = writeBatch(db);
    for (const hospital of hospitals) {
      const docRef = doc(db, 'hospitals', hospital.id);
      hospitalBatch.set(docRef, {
        ...hospital,
        updatedAt: serverTimestamp(),
      });
    }
    await hospitalBatch.commit();
    console.log(`[Reset-Demo] Restored ${hospitals.length} hospitals.`);

    // 2. Delete all incidents and events
    console.log('[Reset-Demo] Clearing incidents collection...');
    const incidentsSnap = await getDocs(collection(db, 'incidents'));
    for (const incidentDoc of incidentsSnap.docs) {
      // Clear subcollection events
      const eventsSnap = await getDocs(collection(db, `incidents/${incidentDoc.id}/events`));
      for (const ev of eventsSnap.docs) {
        await deleteDoc(ev.ref);
      }
      await deleteDoc(incidentDoc.ref);
    }
    console.log(`[Reset-Demo] Cleared ${incidentsSnap.size} incident documents.`);
    console.log('[Reset-Demo] Demo environment successfully reset!');
    return { success: true };
  } catch (err) {
    console.error('[Reset-Demo] Error during reset:', err.message);
    return { success: false, error: err.message };
  }
}

// Direct execution
if (process.argv[1] && process.argv[1].endsWith('resetDemo.js')) {
  resetDemo()
    .then((res) => {
      if (res.success) process.exit(0);
      else process.exit(1);
    })
    .catch((err) => {
      console.error('[Reset-Demo] Fatal error:', err);
      process.exit(1);
    });
}
