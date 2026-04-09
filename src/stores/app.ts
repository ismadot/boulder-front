import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from 'firebase/auth';
import type { VideoFile, JobState } from '../lib/api';

// ─── App store ──────────────────────────────────────────────────────
interface AppState {
  // Auth — NOT persisted (Firebase restores it via onAuthStateChanged)
  user: User | null;
  authReady: boolean;           // true once onAuthStateChanged fires at least once
  setUser: (u: User | null) => void;
  setAuthReady: (r: boolean) => void;

  // Videos
  videos: VideoFile[];
  setVideos: (v: VideoFile[]) => void;
  addVideo: (v: VideoFile) => void;

  // Selected video for processing
  selectedVideo: VideoFile | null;
  selectVideo: (v: VideoFile | null) => void;

  // Active job
  activeJob: JobState | null;
  setActiveJob: (j: JobState | null) => void;
  updateJobProgress: (status: string, progress: number, currentFrame: number, totalFrames: number) => void;

  // Job history
  jobHistory: JobState[];
  addJobToHistory: (j: JobState) => void;

  // UI
  view: 'upload' | 'processing' | 'results';
  setView: (v: 'upload' | 'processing' | 'results') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      authReady: false,
      setUser: (user) => set({ user }),
      setAuthReady: (authReady) => set({ authReady }),

      videos: [],
      setVideos: (videos) => set({ videos }),
      addVideo: (v) => set((s) => ({ videos: [...s.videos, v] })),

      selectedVideo: null,
      selectVideo: (v) => set({ selectedVideo: v }),

      activeJob: null,
      setActiveJob: (j) => set({ activeJob: j }),
      updateJobProgress: (status, progress, currentFrame, totalFrames) =>
        set((s) => {
          if (!s.activeJob) return {};
          const pct = Math.min(100, progress);
          return {
            activeJob: {
              ...s.activeJob,
              status: status as JobState['status'],
              progress,
              current_frame: currentFrame,
              total_frames: totalFrames,
              percent_done: Math.round(pct * 10) / 10,
              percent_remaining: Math.round((100 - pct) * 10) / 10,
              frames_remaining: Math.max(0, totalFrames - currentFrame),
            },
          };
        }),

      jobHistory: [],
      addJobToHistory: (j) => set((s) => ({ jobHistory: [j, ...s.jobHistory] })),

      view: 'upload',
      setView: (view) => set({ view }),
    }),
    {
      name: 'boulder-app',
      // Only persist state that must survive a reload; videos come from the server
      partialize: (s) => ({
        activeJob: s.activeJob,
        jobHistory: s.jobHistory,
        view: s.view,
      }),
    },
  ),
);
