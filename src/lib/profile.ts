/**
 * User profile persistence — Firestore "profiles" collection.
 *
 * Each document is keyed by the Firebase Auth UID and stores:
 *   - email, displayName (from Google login)
 *   - height_m, weight_kg (entered by user)
 *   - updatedAt timestamp
 *
 * The profile is loaded once on login and cached in the Zustand store.
 * Changes are saved immediately to Firestore and reflected in the store.
 */

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth } from './firebase';

// Re-use the existing Firebase app instance
const db = getFirestore(auth.app);

// ─── Types ──────────────────────────────────────────────────────────
export interface ClimberProfile {
  uid: string;
  email: string;
  displayName: string;
  height_m: number | null;   // metres (e.g. 1.75)
  weight_kg: number | null;  // kilograms (e.g. 70)
}

const COLLECTION = 'profiles';

// ─── Read ───────────────────────────────────────────────────────────
export async function loadProfile(uid: string): Promise<ClimberProfile | null> {
  const snap = await getDoc(doc(db, COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    email: data.email ?? '',
    displayName: data.displayName ?? '',
    height_m: data.height_m ?? null,
    weight_kg: data.weight_kg ?? null,
  };
}

// ─── Write ──────────────────────────────────────────────────────────
export async function saveProfile(profile: ClimberProfile): Promise<void> {
  await setDoc(
    doc(db, COLLECTION, profile.uid),
    {
      email: profile.email,
      displayName: profile.displayName,
      height_m: profile.height_m,
      weight_kg: profile.weight_kg,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
