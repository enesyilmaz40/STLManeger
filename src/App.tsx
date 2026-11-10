import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsView } from './components/projects/ProjectsView';
import { ModelsView } from './components/models/ModelsView';
import { SettingsView } from './components/settings/SettingsView';
import { ModelDetailModal } from './components/detail/ModelDetailModal';

export const App: React.FC = () => {
  const {
    roots,
    currentView,
    refreshAll,
    selectedModelId,
    setSelectedModelId,
    setScanProgress,
    setIsScanning,
    fetchModels,
    fetchStats,
    fetchProjects,
  } = useAppStore();

  useEffect(() => {
    // Initial data load
    refreshAll();

    // Setup IPC listeners
    const unsubScan = window.api.onScanProgress((prog) => {
      setIsScanning(true);
      setScanProgress(prog);
    });

    const unsubThumb = window.api.onThumbnailReady(() => {
      fetchModels();
      fetchProjects();
      fetchStats();
    });

    const unsubLib = window.api.onLibraryChanged(() => {
      setIsScanning(false);
      setScanProgress(null);
      refreshAll();
    });

    return () => {
      unsubScan();
      unsubThumb();
      unsubLib();
    };
  }, []);

  const renderMainContent = () => {
    // If no folders added yet, show onboarding welcome screen
    if (roots.length === 0) {
      return <WelcomeScreen />;
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'projects':
        return <ProjectsView />;
      case 'models':
      case 'favorites':
      case 'recent':
        return <ModelsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100">
      {/* Left Navigation Sidebar */}
      <Sidebar />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {renderMainContent()}
        </main>
      </div>

      {/* 3-Panel Model Detail Fullscreen View / Modal */}
      {selectedModelId !== null && (
        <ModelDetailModal
          modelId={selectedModelId}
          onClose={() => setSelectedModelId(null)}
        />
      )}
    </div>
  );
};

export default App;

