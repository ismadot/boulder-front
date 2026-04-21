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

import { auth } from './firebase';

/** Fetch wrapper that injects Firebase ID token as Bearer auth header. */
export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const user = auth.currentUser;
  const headers = new Headers(init?.headers);
  if (user) {
    const token = await user.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${_origin}${path}`, { ...init, headers });
}

// ─── Types ──────────────────────────────────────────────────────────
export interface VideoFile {
  filename: string;
  path: string;
  size_mb: number;
}

export interface JobState {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'error' | 'cancelled';
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
  const res = await authFetch('/api/config');
  if (!res.ok) throw new Error('Failed to load config');
  return res.json();
}

export async function updateConfig(config: Record<string, unknown>) {
  const res = await authFetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to save config');
  return res.json();
}

// ─── Videos ─────────────────────────────────────────────────────────
export async function listVideos(): Promise<VideoFile[]> {
  const res = await authFetch('/api/videos');
  return res.json();
}

export async function uploadVideo(file: File): Promise<VideoFile> {
  const form = new FormData();
  form.append('file', file);
  const res = await authFetch('/api/videos/upload', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function deleteVideo(filename: string): Promise<void> {
  const res = await authFetch(`/api/videos/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Delete failed');
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
  const res = await authFetch('/api/jobs', {
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
  const res = await authFetch(`/api/jobs/${jobId}`);
  if (!res.ok) throw new Error('Job not found');
  return res.json();
}

export async function cancelJob(jobId: string): Promise<void> {
  const res = await authFetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to cancel job');
  }
}

export async function deleteJob(jobId: string): Promise<void> {
  const res = await authFetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete job');
  }
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
  const res = await authFetch(`/api/jobs/${jobId}/summary`);
  if (!res.ok) throw new Error('Summary not available');
  return res.json();
}

// ─── Gallery ────────────────────────────────────────────────────────
export interface GalleryEntry {
  id: string;
  uid: string;
  email: string;
  job_id: string;
  original_filename: string;
  gcs_video_object: string;
  gcs_output_object: string;
  gcs_report_csv_object: string;
  gcs_report_txt_object: string;
  stats: Record<string, unknown>;
  created_at: string;
  // Signed URLs (present when fetching single entry)
  output_url?: string;
  report_csv_url?: string;
  report_txt_url?: string;
}

export async function listGallery(): Promise<GalleryEntry[]> {
  const res = await authFetch('/api/gallery');
  if (!res.ok) throw new Error('Failed to load gallery');
  return res.json();
}

export async function getGalleryEntry(entryId: string): Promise<GalleryEntry> {
  const res = await authFetch(`/api/gallery/${entryId}`);
  if (!res.ok) throw new Error('Gallery entry not found');
  return res.json();
}

export async function deleteGalleryEntry(entryId: string): Promise<void> {
  const res = await authFetch(`/api/gallery/${entryId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete entry');
}
