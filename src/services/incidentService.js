/**
 * GoldenHour Incident Service & Lifecycle Management
 * Enforces strict finite state transitions, Firestore transactions for audit safety,
 * server timestamps, and realtime subscriptions for dispatchers, hospitals, and ambulances.
 */

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { INCIDENT_STATUSES, ALLOWED_STATUS_TRANSITIONS } from '../config/constants.js';

/**
 * Validates whether a state transition is legal according to GoldenHour lifecycle rules.
 * @param {string} currentStatus 
 * @param {string} targetStatus 
 * @returns {boolean}
 */
export function isTransitionAllowed(currentStatus, targetStatus) {
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
}

/**
 * Helper to execute a state transition inside an atomic Firestore transaction.
 * @param {string} id Incident Document ID
 * @param {string} targetStatus Target Status
 * @param {Object} additionalFields Extra incident fields to persist
 * @param {string} eventMessage Human-readable audit message
 * @param {string} [eventType='STATUS_CHANGE'] Audit event type
 * @returns {Promise<Object>} Updated incident snapshot
 */
async function transitionIncidentState(
  id,
  targetStatus,
  additionalFields = {},
  eventMessage = '',
  eventType = 'STATUS_CHANGE'
) {
  if (!id || typeof id !== 'string') {
    throw new Error('Valid incident ID required.');
  }

  const incidentRef = doc(db, 'incidents', id);

  return await runTransaction(db, async (transaction) => {
    const incidentSnap = await transaction.get(incidentRef);
    if (!incidentSnap.exists()) {
      throw new Error(`Incident with ID "${id}" does not exist.`);
    }

    const currentData = incidentSnap.data();
    const currentStatus = currentData.status;

    if (!isTransitionAllowed(currentStatus, targetStatus)) {
      throw new Error(
        `Invalid status transition: Cannot change status from "${currentStatus}" to "${targetStatus}".`
      );
    }

    const now = serverTimestamp();

    const updatePayload = {
      ...additionalFields,
      status: targetStatus,
      updatedAt: now,
    };

    transaction.update(incidentRef, updatePayload);

    // Append to subcollection incidents/{id}/events
    const eventRef = doc(collection(db, `incidents/${id}/events`));
    transaction.set(eventRef, {
      type: eventType,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      message: eventMessage || `Status changed from ${currentStatus} to ${targetStatus}`,
      at: now,
    });

    return {
      id,
      ...currentData,
      ...updatePayload,
    };
  });
}

/**
 * Creates a new emergency incident with status 'created'.
 * @param {Object} params
 * @param {string} [params.source='voice'] - "voice" | "dispatcher"
 * @param {string} [params.transcript=''] - Raw caller transcript
 * @param {string} [params.suggestedType=''] - Type from voice classifier
 * @param {string} [params.emergencyType=null] - Dispatcher confirmed type
 * @param {{ lat: number, lng: number, label: string }} params.patientLocation
 * @returns {Promise<Object>} Created incident doc data
 */
export async function createIncident({
  source = 'voice',
  transcript = '',
  suggestedType = null,
  emergencyType = null,
  patientLocation,
}) {
  if (!patientLocation || typeof patientLocation !== 'object') {
    throw new Error('patientLocation is required to create an incident.');
  }

  const lat = patientLocation.lat ?? patientLocation.latitude;
  const lng = patientLocation.lng ?? patientLocation.longitude;
  const label = patientLocation.label || 'Unknown location';

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('patientLocation must contain numeric latitude and longitude.');
  }

  const incidentCol = collection(db, 'incidents');
  const newDocRef = doc(incidentCol);
  const now = serverTimestamp();

  const incidentData = {
    id: newDocRef.id,
    source,
    transcript: transcript || '',
    suggestedType: suggestedType || null,
    emergencyType: emergencyType || suggestedType || null,
    patientLocation: {
      lat,
      lng,
      label,
    },
    status: INCIDENT_STATUSES.CREATED,
    selectedHospitalId: null,
    rankedSnapshot: null,
    etaMinutes: null,
    timeSaved: null,
    ambulancePosition: {
      lat,
      lng,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };

  await runTransaction(db, async (transaction) => {
    transaction.set(newDocRef, incidentData);

    const eventRef = doc(collection(db, `incidents/${newDocRef.id}/events`));
    transaction.set(eventRef, {
      type: 'INCIDENT_CREATED',
      fromStatus: null,
      toStatus: INCIDENT_STATUSES.CREATED,
      message: `Incident created via ${source} at ${label}`,
      at: now,
    });
  });

  return incidentData;
}

/**
 * Dispatcher confirms or overrides the emergency classification.
 * Transition: created -> confirmed
 * @param {string} id Incident ID
 * @param {string} emergencyType Confirmed clinical category
 * @returns {Promise<Object>}
 */
export async function confirmIncident(id, emergencyType) {
  if (!emergencyType || typeof emergencyType !== 'string') {
    throw new Error('A valid emergencyType string is required to confirm an incident.');
  }

  return await transitionIncidentState(
    id,
    INCIDENT_STATUSES.CONFIRMED,
    { emergencyType: emergencyType.toLowerCase().trim() },
    `Dispatcher confirmed emergency as "${emergencyType}"`,
    'INCIDENT_CONFIRMED'
  );
}

/**
 * Dispatcher commits destination hospital and alerts emergency team.
 * Transition: confirmed -> dispatched
 * @param {string} id Incident ID
 * @param {Object} dispatchDetails
 * @param {string} dispatchDetails.hospitalId
 * @param {Array<Object>} [dispatchDetails.rankedSnapshot]
 * @param {number} [dispatchDetails.etaMinutes]
 * @param {Object} [dispatchDetails.timeSaved]
 * @returns {Promise<Object>}
 */
export async function dispatchIncident(id, {
  hospitalId,
  rankedSnapshot = [],
  etaMinutes = null,
  timeSaved = null,
}) {
  if (!hospitalId || typeof hospitalId !== 'string') {
    throw new Error('hospitalId string is required to dispatch incident.');
  }

  return await transitionIncidentState(
    id,
    INCIDENT_STATUSES.DISPATCHED,
    {
      selectedHospitalId: hospitalId,
      rankedSnapshot: rankedSnapshot ? rankedSnapshot.slice(0, 3) : [],
      etaMinutes: etaMinutes !== null ? Number(etaMinutes) : null,
      timeSaved: timeSaved || null,
    },
    `Dispatched to hospital "${hospitalId}" with ETA ${etaMinutes} min`,
    'INCIDENT_DISPATCHED'
  );
}

/**
 * Receiving hospital emergency department taps 'Ready'.
 * Transition: dispatched -> accepted
 * @param {string} id Incident ID
 * @returns {Promise<Object>}
 */
export async function hospitalAccept(id) {
  return await transitionIncidentState(
    id,
    INCIDENT_STATUSES.ACCEPTED,
    {},
    'Hospital emergency room accepted incoming patient and activated trauma team',
    'HOSPITAL_ACCEPTED'
  );
}

/**
 * Ambulance driver commences navigation.
 * Transition: accepted -> enroute
 * @param {string} id Incident ID
 * @param {{ lat: number, lng: number }} [initialPosition]
 * @returns {Promise<Object>}
 */
export async function startTrip(id, initialPosition = null) {
  const fields = {};
  if (initialPosition && typeof initialPosition.lat === 'number' && typeof initialPosition.lng === 'number') {
    fields.ambulancePosition = {
      lat: initialPosition.lat,
      lng: initialPosition.lng,
      updatedAt: serverTimestamp(),
    };
  }

  return await transitionIncidentState(
    id,
    INCIDENT_STATUSES.ENROUTE,
    fields,
    'Ambulance en route to receiving hospital',
    'TRIP_STARTED'
  );
}

/**
 * Ambulance arrives at receiving facility.
 * Transition: enroute -> arrived
 * @param {string} id Incident ID
 * @returns {Promise<Object>}
 */
export async function markArrived(id) {
  return await transitionIncidentState(
    id,
    INCIDENT_STATUSES.ARRIVED,
    {},
    'Ambulance arrived at hospital emergency bay',
    'AMBULANCE_ARRIVED'
  );
}

/**
 * Cancels an incident.
 * Transition: (created | confirmed | dispatched) -> cancelled
 * @param {string} id Incident ID
 * @param {string} [reason='Cancelled by dispatcher']
 * @returns {Promise<Object>}
 */
export async function cancelIncident(id, reason = 'Cancelled by dispatcher') {
  return await transitionIncidentState(
    id,
    INCIDENT_STATUSES.CANCELLED,
    { cancellationReason: reason },
    `Incident cancelled: ${reason}`,
    'INCIDENT_CANCELLED'
  );
}

/**
 * Updates live GPS position of the ambulance for tracking.
 * @param {string} id Incident ID
 * @param {{ lat: number, lng: number }} position
 */
export async function updateAmbulancePosition(id, position) {
  if (!id || !position || typeof position.lat !== 'number' || typeof position.lng !== 'number') {
    throw new Error('Valid incident ID and numeric lat/lng required.');
  }

  const incidentRef = doc(db, 'incidents', id);
  await runTransaction(db, async (transaction) => {
    transaction.update(incidentRef, {
      ambulancePosition: {
        lat: position.lat,
        lng: position.lng,
        updatedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Subscribes to realtime updates for a specific incident document.
 * @param {string} id Incident ID
 * @param {Function} cb Callback receiving document data
 * @param {Function} [errorCb]
 * @returns {Function} Unsubscribe function
 */
export function subscribeToIncident(id, cb, errorCb) {
  if (!id) throw new Error('Incident ID required for subscription.');
  const incidentRef = doc(db, 'incidents', id);
  return onSnapshot(
    incidentRef,
    (snap) => {
      if (snap.exists()) {
        cb({ id: snap.id, ...snap.data() });
      } else {
        cb(null);
      }
    },
    (err) => {
      if (errorCb) errorCb(err);
      else console.error('[IncidentService] subscribeToIncident error:', err);
    }
  );
}

/**
 * Subscribes to realtime list of incidents filtered by active statuses.
 * @param {Array<string>} statuses Array of incident status strings
 * @param {Function} cb
 * @param {Function} [errorCb]
 * @returns {Function} Unsubscribe function
 */
export function subscribeToIncidentsByStatus(statuses = [], cb, errorCb) {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    throw new Error('statuses array required.');
  }

  const q = query(collection(db, 'incidents'), where('status', 'in', statuses));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      cb(items);
    },
    (err) => {
      if (errorCb) errorCb(err);
      else console.error('[IncidentService] subscribeToIncidentsByStatus error:', err);
    }
  );
}

/**
 * Subscribes to incoming emergency incidents routed to a specific hospital.
 * Realtime feed for Hospital Desk dashboard.
 * @param {string} hospitalId 
 * @param {Function} cb 
 * @param {Function} [errorCb]
 * @returns {Function} Unsubscribe function
 */
export function subscribeToIncomingForHospital(hospitalId, cb, errorCb) {
  if (!hospitalId) throw new Error('hospitalId required.');

  const q = query(
    collection(db, 'incidents'),
    where('selectedHospitalId', '==', hospitalId),
    where('status', 'in', [
      INCIDENT_STATUSES.DISPATCHED,
      INCIDENT_STATUSES.ACCEPTED,
      INCIDENT_STATUSES.ENROUTE,
    ])
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      cb(items);
    },
    (err) => {
      if (errorCb) errorCb(err);
      else console.error('[IncidentService] subscribeToIncomingForHospital error:', err);
    }
  );
}
