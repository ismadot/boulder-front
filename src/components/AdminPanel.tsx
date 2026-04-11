import { useEffect, useState } from 'react';
import {
  listAllowedUsers,
  inviteUser,
  removeUser,
  type AllowedUser,
  type UserRole,
} from '../lib/access';

export function AdminPanel() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setUsers(await listAllowedUsers());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await inviteUser(trimmed, role);
      setEmail('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inviting user');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (target: string) => {
    if (!confirm(`¿Eliminar acceso de ${target}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await removeUser(target);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error removing user');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">Gestión de usuarios</h2>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@ejemplo.com"
            className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-md text-sm font-medium transition-colors"
        >
          Invitar
        </button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* User list */}
      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-800">
              <th className="pb-2">Email</th>
              <th className="pb-2">Rol</th>
              <th className="pb-2">Invitado por</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email} className="border-b border-gray-800/50">
                <td className="py-2 text-gray-200">{u.email}</td>
                <td className="py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      u.role === 'admin'
                        ? 'bg-amber-900/40 text-amber-400'
                        : 'bg-emerald-900/40 text-emerald-400'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="py-2 text-gray-500">{u.invited_by ?? '—'}</td>
                <td className="py-2 text-right">
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => handleRemove(u.email)}
                      disabled={busy}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
