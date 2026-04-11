/**
 * Access control — calls backend /api/auth/* and /api/admin/* endpoints.
 * The backend manages the Firestore "allowed_emails" collection.
 */

import { authFetch } from './api';

export type UserRole = 'admin' | 'viewer' | 'pending';

export interface AllowedUser {
  email: string;
  role: UserRole;
  invited_by: string;
}

/** Post-login: verify token + get role from backend. */
export async function checkSession(): Promise<{ uid: string; email: string; role: UserRole }> {
  const res = await authFetch('/api/auth/me', { method: 'POST' });
  if (res.status === 403) throw new Error('not_authorized');
  if (!res.ok) throw new Error('auth_failed');
  return res.json();
}

/** Admin: list all whitelisted emails. */
export async function listAllowedUsers(): Promise<AllowedUser[]> {
  const res = await authFetch('/api/admin/users');
  if (!res.ok) throw new Error('Forbidden');
  return res.json();
}

/** Admin: invite a user by email. */
export async function inviteUser(email: string, role: UserRole = 'viewer'): Promise<void> {
  const res = await authFetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to invite');
  }
}

/** Admin: remove a user from the whitelist. */
export async function removeUser(email: string): Promise<void> {
  const res = await authFetch(`/api/admin/users/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to remove');
  }
}
