import React from 'react';
import { useThemeStore } from '../stores/themeStore';
import { useDatasetStore } from '../stores/datasetStore';
import { 
  Sun, Moon, Volume2, VolumeX, Sparkles, Activity, 
  HelpCircle, ShieldCheck, Database
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const { theme, toggleTheme, soundEnabled, toggleSound } = useThemeStore();
  const { profile, datasetName, totalRows, totalCols } = useDatasetStore();

  const isStark = theme === 'stark';
  const score = profile?.health_score?.overall ?? null;

  return (
    <header className={`h-16 px-6 border-b flex items-center justify-between transition-colors duration-300 z-30 select-none ${
      isStark 
        ? 'bg-[#050B14]/90 border-[rgba(0,229,255,0.2)] text-[#E2F1FF] backdrop-blur-md' 
        : 'bg-white border-slate-200 text-slate-900 shadow-xs'
    }`}>
      {/* Brand & Project Info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm ${
            isStark 
              ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_12px_rgba(0,229,255,0.4)]' 
              : 'bg-indigo-600 text-white'
          }`}>
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-lg font-bold tracking-tight ${isStark ? 'font-["Orbitron"] text-[#00E5FF]' : 'text-slate-900'}`}>
                DATAFORGE
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isStark ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800' : 'bg-indigo-50 text-indigo-700'
              }`}>
                v1.0 Local
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#7FA3C7] flex items-center gap-1.5">
              <Database className="w-3 h-3" />
              {datasetName ? `${datasetName} (${totalRows.toLocaleString()} rows)` : 'No dataset loaded'}
            </p>
          </div>
        </div>
      </div>

      {/* Middle Status Indicator */}
      <div className="hidden md:flex items-center space-x-3">
        {score !== null ? (
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold ${
            isStark 
              ? 'bg-cyan-950/40 border border-cyan-500/40 text-[#00E5FF]' 
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>DATA HEALTH: {score}/100</span>
            <span className="text-emerald-500 font-bold ml-1">● READY</span>
          </div>
        ) : (
          <div className="text-xs text-slate-400 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>100% Local Processing • No Cloud Upload</span>
          </div>
        )}
      </div>

      {/* Right Controls: Theme toggle, SFX toggle */}
      <div className="flex items-center space-x-3">
        {/* Sound SFX button */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Disable UI sound effects' : 'Enable Stark HUD sound effects'}
          className={`p-2 rounded-lg border transition-all ${
            soundEnabled 
              ? (isStark ? 'border-cyan-500 text-[#00E5FF] bg-cyan-950/50 shadow-[0_0_8px_rgba(0,229,255,0.3)]' : 'border-indigo-400 text-indigo-600 bg-indigo-50')
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-cyan-300'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isStark 
              ? 'border-cyan-500/50 bg-[#00E5FF]/10 text-[#00E5FF] hover:bg-[#00E5FF]/20 shadow-[0_0_10px_rgba(0,229,255,0.25)]' 
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs'
          }`}
        >
          {isStark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Theme: STARK</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span>Theme: Professional</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
