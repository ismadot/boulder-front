import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { VideoUpload } from './components/VideoUpload';
import { VideoList } from './components/VideoList';
import { JobProgress } from './components/JobProgress';
import { ResultsView } from './components/ResultsView';
import { useAppStore } from './stores/app';

function App() {
  const view = useAppStore((s) => s.view);
  const activeJob = useAppStore((s) => s.activeJob);
  const setView = useAppStore((s) => s.setView);

  // On first render: if a completed job was persisted, go straight to results
  useEffect(() => {
    if (activeJob?.status === 'done' && view !== 'results') {
      setView('results');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
