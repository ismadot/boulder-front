import { useEffect, useState } from 'react';
import { streamJob, getJob, videoUrl, reportUrl } from '../lib/api';
import { useAppStore } from '../stores/app';

// ─── Spinner ────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function fmtElapsed(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtEta(secs: number | null) {
  if (secs === null || secs <= 0) return null;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return m > 0 ? `~${m}m ${s}s restantes` : `~${s}s restantes`;
}

export function JobProgress() {
  const activeJob = useAppStore((s) => s.activeJob);
  const setActiveJob = useAppStore((s) => s.setActiveJob);
  const updateJobProgress = useAppStore((s) => s.updateJobProgress);
  const addJobToHistory = useAppStore((s) => s.addJobToHistory);
  const setView = useAppStore((s) => s.setView);

  const [elapsed, setElapsed] = useState(0);

  // Elapsed timer — runs while processing
  useEffect(() => {
    if (!activeJob || (activeJob.status !== 'queued' && activeJob.status !== 'processing')) {
      setElapsed(0);
      return;
    }
    const startTs = activeJob.created_at
      ? Date.now() - (Date.now() - activeJob.created_at * 1000)
      : Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTs) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [activeJob?.id, activeJob?.status]);

  // SSE subscription
  useEffect(() => {
    if (!activeJob || activeJob.status === 'done' || activeJob.status === 'error') return;

    let es: EventSource | null = null;
    let cancelled = false;

    streamJob(activeJob.id, (status, progress, currentFrame, totalFrames) => {
      updateJobProgress(status, progress, currentFrame, totalFrames);

      if (status === 'done' || status === 'error') {
        getJob(activeJob.id).then((j) => {
          setActiveJob(j);
          addJobToHistory(j);
          if (status === 'done') setView('results');
        });
      }
    }).then((source) => {
      if (cancelled) { source.close(); return; }
      es = source;
    });

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [activeJob, addJobToHistory, setActiveJob, setView, updateJobProgress]);

  if (!activeJob) {
    return (
      <div className="text-center text-gray-500 py-12">
        <p>No active job. Upload a video and click Process to begin.</p>
      </div>
    );
  }

  // Backend sends progress as 0-100
  const pct = Math.min(100, Math.round(activeJob.progress));
  const isRunning = activeJob.status === 'queued' || activeJob.status === 'processing';
  const isDone = activeJob.status === 'done';
  const isError = activeJob.status === 'error';

  const statusColor = isDone
    ? 'text-emerald-400'
    : isError
    ? 'text-red-400'
    : 'text-amber-400';

  const barColor = isDone
    ? 'bg-emerald-500'
    : isError
    ? 'bg-red-500'
    : 'bg-emerald-500';

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Processing</h2>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isRunning && <Spinner />}
            {isDone && (
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isError && (
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium text-sm">
              {activeJob.video_path.split('/').pop()}
            </span>
          </div>
          <span className={`text-sm font-semibold capitalize ${statusColor}`}>
            {activeJob.status}
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
            {activeJob.status === 'queued' ? (
              <div className="h-full w-1/3 bg-amber-500 rounded-full animate-pulse" />
            ) : (
              <div
                className={`h-full ${barColor} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{isRunning ? `${fmtElapsed(elapsed)} transcurridos` : ''}</span>
            <span className="flex items-center gap-3">
              {activeJob.total_frames > 0 && (
                <span>
                  frame{' '}
                  <span className="text-gray-300">{activeJob.current_frame}</span>
                  {' / '}
                  <span className="text-gray-300">{activeJob.total_frames}</span>
                  {activeJob.frames_remaining > 0 && (
                    <span className="text-gray-600"> ({activeJob.frames_remaining} restantes)</span>
                  )}
                </span>
              )}
              <span>
                {activeJob.status === 'queued'
                  ? 'en cola…'
                  : `${pct}% · ${100 - pct}% restante`}
              </span>
            </span>
          </div>
          {/* ETA row */}
          {isRunning && activeJob.eta_s !== null && activeJob.eta_s > 0 && (
            <p className="text-xs text-gray-600 text-right">{fmtEta(activeJob.eta_s)}</p>
          )}
        </div>

        {/* Stats from job (frames, fps, etc.) */}
        {activeJob.stats && Object.keys(activeJob.stats).length > 0 && (
          <div className="flex flex-wrap gap-3">
            {Object.entries(activeJob.stats).map(([k, v]) => (
              <span key={k} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                {k}: <span className="text-gray-200">{String(v)}</span>
              </span>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">
            {activeJob.error}
          </p>
        )}

        {/* Download links when done */}
        {isDone && (
          <div className="flex flex-wrap gap-3 pt-1">
            <a
              href={videoUrl(activeJob.id)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-md text-sm font-medium transition-colors"
              download
            >
              Descargar video
            </a>
            <a
              href={reportUrl(activeJob.id, 'csv')}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm font-medium transition-colors"
              download
            >
              CSV
            </a>
            <a
              href={reportUrl(activeJob.id, 'txt')}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm font-medium transition-colors"
              download
            >
              TXT
            </a>
            <button
              onClick={() => setView('results')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors"
            >
              Ver resultados →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

