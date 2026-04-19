import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listGallery,
  getGalleryEntry,
  deleteGalleryEntry,
  getJobSummary,
  videoUrl,
  type GalleryEntry,
  type JobSummary,
} from '../lib/api';
import { ClimbingStatusChart } from './ClimbingStatusChart';

// ─── Detail modal ────────────────────────────────────────────────────
function EntryDetail({ entry, onClose }: { entry: GalleryEntry; onClose: () => void }) {
  // Fetch signed URLs
  const { data: detail } = useQuery({
    queryKey: ['gallery', entry.id],
    queryFn: () => getGalleryEntry(entry.id),
    initialData: entry,
  });

  // Fetch summary stats from the job endpoint
  const { data: summary } = useQuery<JobSummary>({
    queryKey: ['summary', entry.job_id],
    queryFn: () => getJobSummary(entry.job_id),
    retry: false,
  });

  const videoSrc = detail?.output_url || videoUrl(entry.job_id);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video player */}
        <div className="bg-black rounded-t-xl overflow-hidden">
          <video
            controls
            preload="metadata"
            playsInline
            className="w-full max-h-[60vh]"
            src={videoSrc}
          />
        </div>

        <div className="p-5 space-y-4">
          {/* Info */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-gray-100">{entry.original_filename}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {detail?.output_url && (
                <a
                  href={detail.output_url}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-md text-xs font-medium transition-colors"
                  download
                >
                  Descargar video
                </a>
              )}
              {detail?.report_csv_url && (
                <a
                  href={detail.report_csv_url}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-xs font-medium transition-colors"
                  download
                >
                  CSV
                </a>
              )}
              {detail?.report_txt_url && (
                <a
                  href={detail.report_txt_url}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-xs font-medium transition-colors"
                  download
                >
                  TXT
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          {entry.stats && Object.keys(entry.stats).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-800">
              {Object.entries(entry.stats).map(([k, v]) => (
                <span key={k} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                  {k}: <span className="text-gray-200">{String(v)}</span>
                </span>
              ))}
            </div>
          )}

          {/* Summary chart */}
          {summary && <ClimbingStatusChart summary={summary} />}

          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm text-gray-400 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Gallery grid ────────────────────────────────────────────────────
export function Gallery() {
  const queryClient = useQueryClient();
  const [selectedEntry, setSelectedEntry] = useState<GalleryEntry | null>(null);

  const { data: entries = [], isLoading, isError } = useQuery({
    queryKey: ['gallery'],
    queryFn: listGallery,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGalleryEntry,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gallery'] }),
  });

  if (isLoading) {
    return <p className="text-sm text-gray-500 animate-pulse">Cargando galería…</p>;
  }

  if (isError) {
    return <p className="text-sm text-red-400">Error al cargar la galería.</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-gray-500 text-sm">No hay videos procesados aún.</p>
        <p className="text-gray-600 text-xs">
          Sube y procesa un video para verlo aquí.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-100">Mis Videos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors cursor-pointer group"
              onClick={() => setSelectedEntry(entry)}
            >
              {/* Thumbnail — use video poster frame */}
              <div className="aspect-video bg-gray-800 flex items-center justify-center">
                <video
                  preload="metadata"
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  src={`${videoUrl(entry.job_id)}#t=1`}
                />
              </div>

              <div className="p-3 space-y-2">
                <p className="text-sm font-medium text-gray-200 truncate group-hover:text-emerald-400 transition-colors">
                  {entry.original_filename}
                </p>
                <p className="text-xs text-gray-500">
                  {entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}
                </p>

                {/* Quick stats */}
                {entry.stats && (
                  <div className="flex flex-wrap gap-1.5">
                    {entry.stats.total_frames != null && (
                      <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                        {String(entry.stats.total_frames)} frames
                      </span>
                    )}
                    {entry.stats.processing_fps != null && (
                      <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                        {String(entry.stats.processing_fps)} fps
                      </span>
                    )}
                  </div>
                )}

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('¿Eliminar esta entrada de la galería?')) {
                      deleteMutation.mutate(entry.id);
                    }
                  }}
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail overlay */}
      {selectedEntry && (
        <EntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </>
  );
}
