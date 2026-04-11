import type { ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAppStore } from '../stores/app';

const baseTabs = [
  { key: 'upload' as const, label: 'Upload' },
  { key: 'processing' as const, label: 'Processing' },
  { key: 'results' as const, label: 'Results' },
];

export function Layout({ children }: { children: ReactNode }) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const user = useAppStore((s) => s.user);
  const userRole = useAppStore((s) => s.userRole);

  const tabs = userRole === 'admin'
    ? [...baseTabs, { key: 'admin' as const, label: 'Admin' }]
    : baseTabs;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-emerald-400">Boulder</span> Analyzer
        </h1>
        <div className="flex items-center gap-4">
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === t.key
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          {/* User avatar + sign out */}
          {user && (
            <div className="flex items-center gap-2 pl-4 border-l border-gray-800">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? ''}
                  className="w-7 h-7 rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
              <button
                onClick={() => signOut(auth)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">{children}</main>
    </div>
  );
}
