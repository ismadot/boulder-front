import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { videoUrl, videoDownloadUrl, reportUrl, getJobSummary, type JobState } from '../lib/api';
import { useAppStore } from '../stores/app';
import { ClimbingStatusChart } from './ClimbingStatusChart';

// ─── Movement badge colors ───────────────────────────────────────────
const MOVEMENT_COLOR: Record<string, string> = {
  Flag: 'bg-violet-800 text-violet-200',
  'Heel Hook': 'bg-amber-800 text-amber-200',
  'Toe Hook': 'bg-orange-800 text-orange-200',
  'Drop Knee': 'bg-sky-800 text-sky-200',
  'Side Pull': 'bg-pink-800 text-pink-200',
  Gaston: 'bg-teal-800 text-teal-200',
};
function movementColor(name: string) {
  for (const key of Object.keys(MOVEMENT_COLOR)) {
    if (name.startsWith(key)) return MOVEMENT_COLOR[key];
  }
  return 'bg-gray-700 text-gray-300';
}

// ─── Summary panel ──────────────────────────────────────────────────
function SummaryPanel({ jobId }: { jobId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['summary', jobId],
    queryFn: () => getJobSummary(jobId),
    staleTime: Infinity,
  });

  if (isLoading) {
    return <p className="text-xs text-gray-500 animate-pulse">Cargando resumen…</p>;
  }
  if (isError || !data) {
    return <p className="text-xs text-gray-600">Resumen no disponible (no se generó reporte).</p>;
  }

  const hasMovements = data.movement_counts && Object.keys(data.movement_counts).length > 0;

  return (
    <div className="space-y-5">
      {/* Detection stats */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Detección
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total frames', value: data.total_frames },
            { label: 'Frames detectados', value: `${data.frames_with_detection} (${data.detection_rate_pct}%)` },
            { label: 'Confianza media', value: `${(data.avg_detection_confidence * 100).toFixed(1)}%` },
            { label: 'Completitud esqueleto', value: `${data.avg_skeleton_completeness_pct}%` },
          ].map((s) => (
            <div key={s.label} className="bg-gray-800 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-sm font-semibold text-gray-100 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Movements */}
      {hasMovements && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Movimientos detectados
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.movement_counts)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <span
                  key={name}
                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${movementColor(name)}`}
                >
                  {name}
                  <span className="opacity-70">×{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Centre of Mass */}
      <div className="border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-emerald-400">Centro de Masa (CoM)</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Desplazamiento total:{' '}
              <span className="text-gray-200 font-medium">
                {data.com_total_travel_px.toFixed(0)} px
              </span>{' '}
              en {data.com_sample_count} frames
            </p>
          </div>
          <a
            href="https://doi.org/10.1080/02640414.2012.671533"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-emerald-500 hover:text-emerald-400 underline underline-offset-2 transition-colors"
          >
            Paper →
          </a>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          El CoM se calcula usando los pesos biomecánicos de Dempster (1955) revisados por De Leva (1996),
          ponderando 14 segmentos corporales (cabeza, tronco, brazos, antebrazos, manos, muslos, piernas, pies)
          por su fracción de masa relativa al peso total. En escalada, el desplazamiento del CoM refleja la
          eficiencia del movimiento: trayectorias más cortas indican menor gasto energético.
        </p>
      </div>

      {/* Climbing status radar chart */}
      <ClimbingStatusChart summary={data} />
    </div>
  );
}

// ─── Job card ───────────────────────────────────────────────────────
function JobCard({ job }: { job: JobState }) {
  return (
    <div className="space-y-5">
      {/* Video player — FileResponse handles Range natively in Starlette 1.x */}
      <div className="bg-black rounded-xl overflow-hidden">
        <video
          key={job.id}
          controls
          preload="metadata"
          playsInline
          className="w-full max-h-[70vh]"
          src={videoUrl(job.id)}
        />
      </div>

      {/* Info + download bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-medium">{job.video_path.split('/').pop()}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(job.created_at * 1000).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={videoDownloadUrl(job.id)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-md text-xs font-medium transition-colors"
              download
            >
              Descargar video
            </a>
            <a
              href={reportUrl(job.id, 'csv')}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-xs font-medium transition-colors"
              download
            >
              CSV
            </a>
            <a
              href={reportUrl(job.id, 'txt')}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-xs font-medium transition-colors"
              download
            >
              TXT
            </a>
          </div>
        </div>

        {/* Job stats (processing fps, frames, etc.) */}
        {job.stats && Object.keys(job.stats).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-800">
            {Object.entries(job.stats).map(([k, v]) => (
              <span key={k} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                {k}: <span className="text-gray-200">{String(v)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Report summary */}
      <SummaryPanel jobId={job.id} />
    </div>
  );
}

// ─── Results view ────────────────────────────────────────────────────
export function ResultsView() {
  const activeJob = useAppStore((s) => s.activeJob);
  const jobHistory = useAppStore((s) => s.jobHistory);
  const setView = useAppStore((s) => s.setView);

  const completedJobs = jobHistory.filter((j) => j.status === 'done');
  const defaultJob = activeJob?.status === 'done' ? activeJob : completedJobs[0] ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const currentJob = selectedId
    ? (jobHistory.find((j) => j.id === selectedId) ?? defaultJob)
    : defaultJob;

  if (!currentJob) {
    return (
      <div className="text-center text-gray-500 py-12">
        <p>No hay videos procesados aún.</p>
        <button
          onClick={() => setView('upload')}
          className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-md text-sm font-medium transition-colors text-white"
        >
          Subir un video
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Resultados</h2>

      <JobCard job={currentJob} />

      {completedJobs.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Historial</h3>
          <ul className="space-y-1">
            {completedJobs.map((j) => (
              <li key={j.id}>
                <button
                  onClick={() => setSelectedId(j.id)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                    j.id === currentJob.id
                      ? 'bg-gray-800 text-gray-200'
                      : 'text-gray-500 hover:bg-gray-900 hover:text-gray-300'
                  }`}
                >
                  {j.video_path.split('/').pop()} —{' '}
                  {new Date(j.created_at * 1000).toLocaleTimeString()}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
