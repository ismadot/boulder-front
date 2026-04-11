import { useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { loadProfile } from './lib/profile';
import { checkSession } from './lib/access';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { VideoUpload } from './components/VideoUpload';
import { VideoList } from './components/VideoList';
import { JobProgress } from './components/JobProgress';
import { ResultsView } from './components/ResultsView';
import { AdminPanel } from './components/AdminPanel';
import { useAppStore } from './stores/app';

function App() {
  const view = useAppStore((s) => s.view);
  const activeJob = useAppStore((s) => s.activeJob);
  const setView = useAppStore((s) => s.setView);
  const user = useAppStore((s) => s.user);
  const authReady = useAppStore((s) => s.authReady);
  const setUser = useAppStore((s) => s.setUser);
  const setAuthReady = useAppStore((s) => s.setAuthReady);
  const setClimberProfile = useAppStore((s) => s.setClimberProfile);
  const setUserRole = useAppStore((s) => s.setUserRole);
  const userRole = useAppStore((s) => s.userRole);

  // Subscribe to Firebase auth state once on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const session = await checkSession();
          setUserRole(session.role);
          if (session.role !== 'pending') {
            const profile = await loadProfile(firebaseUser.uid);
            setClimberProfile(profile);
          }
        } catch {
          setUserRole(null);
          setClimberProfile(null);
        }
      } else {
        setUserRole(null);
        setClimberProfile(null);
      }
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

  if (userRole === 'pending') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">
            ¡Hola, {user.displayName?.split(' ')[0] ?? 'escalador'}! 🧗
          </h1>
          <p className="text-sm text-gray-400">
            Tu cuenta está pendiente de aprobación.<br />
            Un administrador te dará acceso pronto.
          </p>
          <button
            onClick={() => signOut(auth)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm text-gray-300 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
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
      {view === 'admin' && <AdminPanel />}
    </Layout>
  );
}

export default App;
