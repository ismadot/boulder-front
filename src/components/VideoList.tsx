import { useEffect, useState } from 'react';
import { listVideos, createJob, type ProcessOptions } from '../lib/api';
import { useAppStore } from '../stores/app';

// ─── Option definitions (matches ProcessRequest in server.py) ───────
const OPTION_GROUPS = [
  {
    label: 'Detección',
    options: [
      {
        key: 'detect_pose',
        label: 'Detección de pose',
        description: 'Detecta el esqueleto del escalador (YOLOv8-Pose). Desactivar lo acelera considerablemente.',
        default: true,
      },
      {
        key: 'detect_holds',
        label: 'Detección de presas',
        description: 'Detecta las presas del muro (requiere climbing_holds.pt). Desactivado por defecto — más lento.',
        default: false,
      },
    ],
  },
  {
    label: 'Visualización',
    options: [
      {
        key: 'show_skeleton',
        label: 'Esqueleto',
        description: 'Dibuja los keypoints y líneas del esqueleto sobre el video.',
        default: true,
      },
      {
        key: 'show_bbox',
        label: 'Bounding box con ID',
        description: 'Muestra el recuadro del escalador con su slug (hawk, lynx…).',
        default: true,
      },
      {
        key: 'show_com',
        label: 'Centro de masa',
        description: 'Dibuja el punto del centro de masa corporal calculado por segmentos.',
        default: true,
      },
      {
        key: 'show_movements',
        label: 'Movimientos',
        description: 'Etiqueta los movimientos detectados: Flag, Heel Hook, Toe Hook, Drop Knee, Side Pull, Gaston.',
        default: true,
      },
      {
        key: 'show_feet',
        label: 'Pies extrapolados',
        description: 'Muestra los puntos de pie estimados cuando el tobillo está visible pero el pie no.',
        default: true,
      },
    ],
  },
  {
    label: 'Reporte',
    options: [
      {
        key: 'generate_report',
        label: 'Generar reporte CSV + TXT',
        description: 'Exporta un CSV con 78+ columnas (keypoints, CoM, movimientos, velocidades) junto al video.',
        default: true,
      },
    ],
  },
] as const;

type OptionKey = 'detect_pose' | 'detect_holds' | 'show_skeleton' | 'show_bbox' | 'show_com' | 'show_movements' | 'show_feet' | 'generate_report';

const DEFAULT_OPTS = Object.fromEntries(
  OPTION_GROUPS.flatMap((g) => g.options.map((o) => [o.key, o.default]))
) as Record<OptionKey, boolean>;

// ─── Toggle ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? 'bg-emerald-500' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// ─── Options panel ──────────────────────────────────────────────────
function OptionsPanel({
  opts,
  setOpts,
}: {
  opts: Record<OptionKey, boolean>;
  setOpts: (o: Record<OptionKey, boolean>) => void;
}) {
  const toggle = (key: OptionKey, val: boolean) => setOpts({ ...opts, [key]: val });

  return (
    <div className="mt-3 space-y-4">
      {OPTION_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {group.label}
          </p>
          <div className="space-y-2">
            {group.options.map((opt) => (
              <div key={opt.key} className="flex items-start gap-3">
                <Toggle
                  checked={opts[opt.key as OptionKey]}
                  onChange={(v) => toggle(opt.key as OptionKey, v)}
                />
                <div>
                  <p className="text-sm text-gray-200 leading-tight">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── VideoList ──────────────────────────────────────────────────────
export function VideoList() {
  const videos = useAppStore((s) => s.videos);
  const setVideos = useAppStore((s) => s.setVideos);
  const setActiveJob = useAppStore((s) => s.setActiveJob);
  const setView = useAppStore((s) => s.setView);

  const [loading, setLoading] = useState<string | null>(null);   // filename being processed
  const [expanded, setExpanded] = useState<string | null>(null); // filename with open options
  const [perVideoOpts, setPerVideoOpts] = useState<Record<string, Record<OptionKey, boolean>>>({});

  useEffect(() => {
    listVideos().then(setVideos).catch(() => {});
  }, [setVideos]);

  const getOpts = (filename: string) => perVideoOpts[filename] ?? DEFAULT_OPTS;
  const setOpts = (filename: string, opts: Record<OptionKey, boolean>) =>
    setPerVideoOpts((prev) => ({ ...prev, [filename]: opts }));

  const process = async (videoPath: string, filename: string) => {
    setLoading(filename);
    const opts = getOpts(filename);
    try {
      const payload: ProcessOptions = { video_path: videoPath, ...opts };
      const { job_id } = await createJob(payload);
      setActiveJob({
        id: job_id,
        status: 'queued',
        progress: 0,
        current_frame: 0,
        total_frames: 0,
        percent_done: 0,
        percent_remaining: 100,
        frames_remaining: 0,
        elapsed_s: 0,
        eta_s: null,
        video_path: videoPath,
        output_path: '',
        report_csv: '',
        report_txt: '',
        error: '',
        stats: {},
        created_at: Date.now() / 1000,
      });
      setView('processing');
    } catch {
      // error visible in JobProgress
    } finally {
      setLoading(null);
    }
  };

  if (!videos.length) {
    return <p className="text-gray-500 text-sm">No hay videos subidos aún.</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Videos subidos</h3>
      <ul className="space-y-2">
        {videos.map((v) => {
          const isExpanded = expanded === v.filename;
          const isProcessing = loading === v.filename;
          const opts = getOpts(v.filename);

          return (
            <li
              key={v.filename}
              className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden"
            >
              {/* Header row */}
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-sm">{v.filename}</p>
                  <p className="text-xs text-gray-500">{v.size_mb.toFixed(1)} MB</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : v.filename)}
                    className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs rounded-md text-gray-400 transition-colors"
                    title="Opciones de procesamiento"
                  >
                    ⚙ {isExpanded ? 'Cerrar' : 'Opciones'}
                  </button>
                  <button
                    onClick={() => process(v.path, v.filename)}
                    disabled={!!loading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm rounded-md font-medium transition-colors"
                  >
                    {isProcessing ? 'Iniciando…' : 'Procesar'}
                  </button>
                </div>
              </div>

              {/* Expandable options */}
              {isExpanded && (
                <div className="border-t border-gray-800 px-4 pb-4">
                  <OptionsPanel opts={opts} setOpts={(o) => setOpts(v.filename, o)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
