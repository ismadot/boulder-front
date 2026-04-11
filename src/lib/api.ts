/**
 * Boulder Analyzer API client.
 *
 * In development: requests go through the Vite proxy (/api → localhost:8000).
 * In production (Vercel): set VITE_API_URL to your server's base URL,
 *   e.g. https://api.boulder-analyzer.com  (no trailing slash, no /api suffix).
 *   The variable is injected at build time by Vite.
 */

const _origin = import.meta.env.VITE_API_URL ?? '';
const BASE = `${_origin}/api`;

// ─── Types ──────────────────────────────────────────────────────────
export interface VideoFile {
  filename: string;
  path: string;
  size_mb: number;
}

export interface JobState {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  // Raw progress
  progress: number;
  current_frame: number;
  total_frames: number;
  // Computed by server
  percent_done: number;
  percent_remaining: number;
  frames_remaining: number;
  elapsed_s: number;
  eta_s: number | null;
  // Paths
  video_path: string;
  output_path: string;
  report_csv: string;
  report_txt: string;
  error: string;
  stats: Record<string, unknown>;
  created_at: number;
}

// ─── Health ─────────────────────────────────────────────────────────
export async function healthCheck() {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}

// ─── Config ─────────────────────────────────────────────────────────
export async function getConfig(): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/config`);
  if (!res.ok) throw new Error('Failed to load config');
  return res.json();
}

export async function updateConfig(config: Record<string, unknown>) {
  const res = await fetch(`${BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to save config');
  return res.json();
}

// ─── Videos ─────────────────────────────────────────────────────────
export async function listVideos(): Promise<VideoFile[]> {
  const res = await fetch(`${BASE}/videos`);
  return res.json();
}

export async function uploadVideo(file: File): Promise<VideoFile> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/videos/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

// ─── Jobs ───────────────────────────────────────────────────────────
export interface ProcessOptions {
  video_path: string;
  // Detection
  detect_pose?: boolean;
  detect_holds?: boolean;
  // Visualization
  show_skeleton?: boolean;
  show_com?: boolean;
  show_movements?: boolean;
  show_bbox?: boolean;
  show_feet?: boolean;
  // Report
  generate_report?: boolean;
  // Climber profile
  climber_height_m?: number;
  climber_weight_kg?: number;
}

export async function createJob(opts: ProcessOptions): Promise<{ job_id: string }> {
  const res = await fetch(`${BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create job');
  }
  return res.json();
}

export async function getJob(jobId: string): Promise<JobState> {
  const res = await fetch(`${BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error('Job not found');
  return res.json();
}

export function streamJob(
  jobId: string,
  onProgress: (status: string, progress: number, currentFrame: number, totalFrames: number) => void,
): EventSource {
  const es = new EventSource(`${BASE}/jobs/${jobId}/stream`);
  es.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onProgress(data.status, data.progress, data.current_frame ?? 0, data.total_frames ?? 0);
    if (data.status === 'done' || data.status === 'error') {
      es.close();
    }
  };
  return es;
}

export function videoUrl(jobId: string) {
  return `${BASE}/jobs/${jobId}/video`;
}

export function videoDownloadUrl(jobId: string) {
  return `${BASE}/jobs/${jobId}/video?download=true`;
}

export function reportUrl(jobId: string, format: 'csv' | 'txt' = 'csv') {
  return `${BASE}/jobs/${jobId}/report?format=${format}`;
}

// ─── Summary ────────────────────────────────────────────────────────
export interface JobSummary {
  total_frames: number;
  frames_with_detection: number;
  detection_rate_pct: number;
  avg_detection_confidence: number;
  avg_skeleton_completeness_pct: number;
  movement_counts: Record<string, number>;
  com_total_travel_px: number;
  com_sample_count: number;
  // Biomechanics (present when climber profile was provided)
  vertical_gain_m: number | null;
  energy_kj: number | null;
  avg_climbing_power_w: number | null;
  max_climbing_power_w: number | null;
}

export async function getJobSummary(jobId: string): Promise<JobSummary> {
  const res = await fetch(`${BASE}/jobs/${jobId}/summary`);
  if (!res.ok) throw new Error('Summary not available');
  return res.json();
}
