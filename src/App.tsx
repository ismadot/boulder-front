import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { VideoUpload } from './components/VideoUpload';
import { VideoList } from './components/VideoList';
import { JobProgress } from './components/JobProgress';
import { ResultsView } from './components/ResultsView';
import { useAppStore } from './stores/app';

function App() {
  const view = useAppStore((s) => s.view);
  const activeJob = useAppStore((s) => s.activeJob);
  const setView = useAppStore((s) => s.setView);
  const user = useAppStore((s) => s.user);
  const authReady = useAppStore((s) => s.authReady);
  const setUser = useAppStore((s) => s.setUser);
  const setAuthReady = useAppStore((s) => s.setAuthReady);

  // Subscribe to Firebase auth state once on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });
    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On first render: if a completed job was persisted, go straight to results
  useEffect(() => {
    if (activeJob?.status === 'done' && view !== 'results') {
      setView('results');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wait for Firebase to resolve auth before rendering anything
  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="text-gray-600 text-sm animate-pulse">Cargando…</span>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      {view === 'upload' && (
        <div className="space-y-8">
          <VideoUpload />
          <VideoList />
        </div>
      )}
      {view === 'processing' && <JobProgress />}
      {view === 'results' && <ResultsView />}
    </Layout>
  );
}

export default App;
