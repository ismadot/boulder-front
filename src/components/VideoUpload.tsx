import { useCallback, useState } from 'react';
import { uploadVideo } from '../lib/api';
import { useAppStore } from '../stores/app';

const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
const MAX_DURATION_S = 10 * 60; // 10 minutes

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve(video.duration);
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      resolve(0); // can't read — let backend validate
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  });
}

export function VideoUpload() {
  const addVideo = useAppStore((s) => s.addVideo);
  const setView = useAppStore((s) => s.setView);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setError(null);

      for (const file of Array.from(files)) {
        // Validate extension
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          setError(`Formato no soportado (${ext}). Permitidos: ${ALLOWED_EXTENSIONS.join(', ')}`);
          return;
        }

        // Validate duration client-side
        const duration = await getVideoDuration(file);
        if (duration > MAX_DURATION_S) {
          const mins = Math.floor(duration / 60);
          const secs = Math.floor(duration % 60);
          setError(`El video dura ${mins}m${secs}s. El máximo permitido es ${MAX_DURATION_S / 60} minutos.`);
          return;
        }
      }

      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const video = await uploadVideo(file);
          addVideo(video);
        }
        setView('processing');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [addVideo, setView],
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Upload Videos</h2>

      {/* Drop zone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          dragging
            ? 'border-emerald-400 bg-emerald-400/10'
            : 'border-gray-700 hover:border-gray-500'
        }`}
      >
        <input
          type="file"
          accept=".mp4,.mov,.avi,.mkv,.webm"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <p className="text-gray-400 animate-pulse">Uploading…</p>
        ) : (
          <>
            <svg className="w-12 h-12 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
            </svg>
            <p className="text-gray-400">Drag & drop video files or click to browse</p>
            <p className="text-gray-600 text-sm mt-1">MP4, MOV, AVI, MKV, WebM — máx. 10 minutos</p>
          </>
        )}
      </label>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
