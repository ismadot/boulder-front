import type { ReactNode } from 'react';
import { useAppStore } from '../stores/app';

const tabs = [
  { key: 'upload' as const, label: 'Upload' },
  { key: 'processing' as const, label: 'Processing' },
  { key: 'results' as const, label: 'Results' },
];

export function Layout({ children }: { children: ReactNode }) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-emerald-400">Boulder</span> Analyzer
        </h1>
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
      </header>

      {/* Main */}
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">{children}</main>
    </div>
  );
}
