import React from 'react';
import { useDatasetStore } from './stores/datasetStore';
import { useThemeStore } from './stores/themeStore';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { ImportView } from './components/ImportView';
import { HealthView } from './components/HealthView';
import { CleanStudioView } from './components/CleanStudioView';
import { DashboardView } from './components/DashboardView';
import { ExportView } from './components/ExportView';

export function App() {
  const { currentStep } = useDatasetStore();
  const { theme } = useThemeStore();
  const isStark = theme === 'stark';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      isStark ? 'bg-[#050B14] text-[#E2F1FF]' : 'bg-[#F7F8FA] text-slate-900'
    }`}>
      {/* Top Navigation */}
      <TopBar />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Workflow Steps Navigation */}
        <Sidebar />

        {/* Dynamic Step View Area */}
        <main className="flex-1 overflow-y-auto">
          {currentStep === 'import' && <ImportView />}
          {currentStep === 'profile' && <HealthView />}
          {currentStep === 'clean' && <CleanStudioView />}
          {currentStep === 'dashboard' && <DashboardView />}
          {currentStep === 'export' && <ExportView />}
        </main>
      </div>
    </div>
  );
}

export default App;
