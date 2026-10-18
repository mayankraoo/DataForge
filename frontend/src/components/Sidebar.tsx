import React from 'react';
import { useDatasetStore } from '../stores/datasetStore';
import { useThemeStore } from '../stores/themeStore';
import { 
  UploadCloud, Activity, Sparkles, LayoutDashboard, 
  Share2, CheckCircle2, ChevronRight 
} from 'lucide-react';

const steps = [
  { id: 'import', label: '1. Import Data', icon: UploadCloud, desc: 'Connect sources & preview' },
  { id: 'profile', label: '2. Profile Health', icon: Activity, desc: 'Detect flaws & anomalies' },
  { id: 'clean', label: '3. Clean Studio', icon: Sparkles, desc: 'Auto-fix & recipe generator' },
  { id: 'dashboard', label: '4. Visualise', icon: LayoutDashboard, desc: 'Auto-charts & filters' },
  { id: 'export', label: '5. Export & Power BI', icon: Share2, desc: 'Handoff ZIP package' },
] as const;

export const Sidebar: React.FC = () => {
  const { currentStep, setCurrentStep, activeDatasetId, profile } = useDatasetStore();
  const { theme, playSound } = useThemeStore();
  const isStark = theme === 'stark';

  const handleStepClick = (stepId: any) => {
    // Prevent skipping ahead if no dataset loaded yet
    if (stepId !== 'import' && !activeDatasetId) return;
    playSound('click');
    setCurrentStep(stepId);
  };

  return (
    <aside className={`w-64 border-r flex flex-col justify-between py-6 px-4 transition-colors duration-300 select-none ${
      isStark 
        ? 'bg-[#050B14]/80 border-[rgba(0,229,255,0.15)] text-[#E2F1FF]' 
        : 'bg-white border-slate-200 text-slate-800'
    }`}>
      <div>
        <div className="px-2 mb-6">
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-[#7FA3C7]">
            PIPELINE WORKFLOW
          </p>
        </div>

        <nav className="space-y-1.5">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = currentStep === s.id;
            const isDisabled = s.id !== 'import' && !activeDatasetId;

            return (
              <button
                key={s.id}
                disabled={isDisabled}
                onClick={() => handleStepClick(s.id)}
                className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between transition-all group ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed'
                    : isActive
                    ? isStark
                      ? 'bg-cyan-500/15 border border-cyan-400/50 text-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                      : 'bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs font-semibold'
                    : isStark
                    ? 'hover:bg-cyan-950/30 text-slate-300 hover:text-cyan-200 border border-transparent'
                    : 'hover:bg-slate-100 text-slate-600 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-1.5 rounded-lg ${
                    isActive 
                      ? isStark ? 'bg-cyan-500/20 text-[#00E5FF]' : 'bg-indigo-600 text-white' 
                      : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-cyan-300'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium leading-none">{s.label}</p>
                    <p className="text-[10px] text-slate-400 dark:text-[#7FA3C7] mt-1 leading-none">{s.desc}</p>
                  </div>
                </div>

                {isActive && (
                  <ChevronRight className="w-4 h-4 text-cyan-400 dark:text-[#00E5FF] animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Dataset quick summary pill */}
      {activeDatasetId && (
        <div className={`p-3.5 rounded-xl border text-xs ${
          isStark 
            ? 'bg-cyan-950/20 border-cyan-500/20 text-[#7FA3C7]' 
            : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-800 dark:text-cyan-300">Active Session</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono">
              PARQUET
            </span>
          </div>
          <p className="text-[11px] truncate text-slate-500 dark:text-slate-400 mb-2">
            ID: {activeDatasetId.slice(0, 8)}...
          </p>
          {profile && (
            <div className="w-full bg-slate-200 dark:bg-cyan-950 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${profile.health_score.overall}%` }} 
              />
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
