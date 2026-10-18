import React, { useState } from 'react';
import { useDatasetStore } from '../stores/datasetStore';
import { useThemeStore } from '../stores/themeStore';
import { 
  Activity, AlertTriangle, AlertCircle, Info, CheckCircle2, 
  ArrowRight, Sparkles, Filter, ChevronDown, Table as TableIcon,
  Search, ShieldAlert
} from 'lucide-react';

export const HealthView: React.FC = () => {
  const { profile, previewRows, previewCols, setCurrentStep, activeDatasetId } = useDatasetStore();
  const { theme, playSound } = useThemeStore();
  const isStark = theme === 'stark';

  const [activeSeverity, setActiveSeverity] = useState<'all' | 'Critical' | 'Warning' | 'Info'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  if (!profile) {
    return (
      <div className="p-12 text-center text-slate-400">
        No dataset profile available. Please import a dataset first.
      </div>
    );
  }

  const { health_score, narrative_summary, top_problems, issues, columns } = profile;

  const filteredIssues = issues.filter((i) => {
    const matchSev = activeSeverity === 'all' || i.severity === activeSeverity;
    const matchSearch = !searchFilter || 
      i.description.toLowerCase().includes(searchFilter.toLowerCase()) || 
      (i.column && i.column.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchSev && matchSearch;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return isStark ? '#00E676' : '#16A34A';
    if (score >= 60) return isStark ? '#FFB300' : '#D97706';
    return isStark ? '#FF3D57' : '#DC2626';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-500/10 text-red-500 border border-red-500/30';
      case 'Warning':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/30';
      default:
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-8 animate-fadeIn">
      {/* Top Banner: Arc Reactor Health Score + Narrative */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Animated Arc-Reactor Health Gauge Card */}
        <div className={`lg:col-span-4 p-6 rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden ${
          isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {isStark && (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.08)_0,transparent_70%)] pointer-events-none" />
          )}

          <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-[#7FA3C7] mb-4">
            DATA HEALTH SCORE
          </p>

          {/* Animated Gauge Ring */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke={isStark ? 'rgba(0,229,255,0.1)' : '#E2E8F0'}
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke={getScoreColor(health_score.overall)}
                strokeWidth="8"
                strokeDasharray={264}
                strokeDashoffset={264 - (264 * health_score.overall) / 100}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* In STARK mode: rotating arc reactor gear */}
            {isStark && (
              <div className="absolute inset-2 border-2 border-dashed border-cyan-400/30 rounded-full animate-arc-spin pointer-events-none" />
            )}

            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className={`text-4xl font-extrabold ${isStark ? 'font-["Orbitron"] text-[#00E5FF]' : 'text-slate-900'}`}>
                {health_score.overall}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-[#7FA3C7] uppercase font-semibold">
                out of 100
              </span>
            </div>
          </div>

          {/* Breakdown bars */}
          <div className="grid grid-cols-2 gap-3 w-full mt-6 text-xs">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-cyan-950/30 border dark:border-cyan-500/20">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-500 dark:text-[#7FA3C7]">Completeness</span>
                <span className="font-bold">{health_score.completeness}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-cyan-950 h-1 rounded-full">
                <div className="bg-indigo-600 dark:bg-[#00E5FF] h-full rounded-full" style={{ width: `${health_score.completeness}%` }} />
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-50 dark:bg-cyan-950/30 border dark:border-cyan-500/20">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-500 dark:text-[#7FA3C7]">Uniqueness</span>
                <span className="font-bold">{health_score.uniqueness}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-cyan-950 h-1 rounded-full">
                <div className="bg-indigo-600 dark:bg-[#00E5FF] h-full rounded-full" style={{ width: `${health_score.uniqueness}%` }} />
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-50 dark:bg-cyan-950/30 border dark:border-cyan-500/20">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-500 dark:text-[#7FA3C7]">Validity</span>
                <span className="font-bold">{health_score.validity}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-cyan-950 h-1 rounded-full">
                <div className="bg-indigo-600 dark:bg-[#00E5FF] h-full rounded-full" style={{ width: `${health_score.validity}%` }} />
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-50 dark:bg-cyan-950/30 border dark:border-cyan-500/20">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-500 dark:text-[#7FA3C7]">Consistency</span>
                <span className="font-bold">{health_score.consistency}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-cyan-950 h-1 rounded-full">
                <div className="bg-indigo-600 dark:bg-[#00E5FF] h-full rounded-full" style={{ width: `${health_score.consistency}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Narrative Summary & Action Callout */}
        <div className={`lg:col-span-8 p-6 rounded-2xl border flex flex-col justify-between ${
          isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-500 dark:text-[#00E5FF]" />
                <h2 className={`text-lg font-bold ${isStark ? 'text-[#00E5FF]' : 'text-slate-900'}`}>
                  Automated Data Narrative & Insights
                </h2>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-cyan-950/50 text-slate-600 dark:text-cyan-300 border dark:border-cyan-500/30">
                Rule-Based Synthesis
              </span>
            </div>

            <p className="text-sm text-slate-600 dark:text-[#7FA3C7] leading-relaxed mb-6">
              {narrative_summary}
            </p>

            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-cyan-300 mb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Top 5 Critical Flaws Detected
            </h3>
            <div className="space-y-2">
              {top_problems.map((prob, idx) => (
                <div 
                  key={idx}
                  className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-cyan-950/20 p-2.5 rounded-lg border border-slate-100 dark:border-cyan-500/10"
                >
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{prob}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-cyan-500/20 flex items-center justify-between">
            <p className="text-xs text-slate-400 dark:text-[#7FA3C7]">
              {issues.length} automated fixes ready for review in Cleaning Studio
            </p>
            <button
              onClick={() => { playSound('click'); setCurrentStep('clean'); }}
              className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                isStark
                  ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              }`}
            >
              <span>Proceed to Clean Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Issues Catalog with Filters */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className={`text-base font-bold ${isStark ? 'text-[#00E5FF]' : 'text-slate-900'}`}>
              Detected Issues Catalog ({filteredIssues.length})
            </h3>
            <p className="text-xs text-slate-400 dark:text-[#7FA3C7]">
              Each issue is paired with suggested transformations and before/after previews
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search issues..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border bg-transparent dark:border-cyan-500/30 w-44"
              />
            </div>

            {/* Severity Pill Filter */}
            <div className="flex items-center space-x-1 border rounded-lg p-0.5 dark:border-cyan-500/30 text-xs">
              {(['all', 'Critical', 'Warning', 'Info'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => { playSound('click'); setActiveSeverity(sev); }}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                    activeSeverity === sev
                      ? isStark
                        ? 'bg-cyan-500/20 text-[#00E5FF]'
                        : 'bg-indigo-600 text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-[#7FA3C7]'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Issue Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-2xs hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getSeverityBadge(issue.severity)}`}>
                    {issue.severity}
                  </span>
                  {issue.column && (
                    <span className="text-[11px] font-mono text-slate-400 dark:text-[#7FA3C7]">
                      {issue.column}
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold text-slate-800 dark:text-cyan-200 mb-2">
                  {issue.description}
                </p>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 space-y-1">
                  <div>Affected: <strong>{issue.affected_rows_count.toLocaleString()} rows</strong> ({issue.affected_rows_pct}%)</div>
                  <div>Suggested Fix: <span className="text-indigo-600 dark:text-[#00E5FF] font-medium">{issue.suggested_action}</span></div>
                </div>

                {issue.before_after_sample.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-cyan-950/30 border border-slate-100 dark:border-cyan-500/20 text-[10px] font-mono space-y-1">
                    <div className="text-red-500 line-through truncate">
                      Before: {issue.before_after_sample[0].before}
                    </div>
                    <div className="text-emerald-500 truncate">
                      After: {issue.before_after_sample[0].after}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column Attributes & Sparkline Distributions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-base font-bold ${isStark ? 'text-[#00E5FF]' : 'text-slate-900'}`}>
              Column Profiles & Sparkline Distributions ({columns.length})
            </h3>
            <p className="text-xs text-slate-400 dark:text-[#7FA3C7]">
              Inferred semantic types, missing rates, cardinality, and distribution histograms
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {columns.map((col) => (
            <div
              key={col.name}
              className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    isStark 
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' 
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                  }`}>
                    {col.inferred_type}
                  </span>
                  <span className={`text-[10px] font-bold ${
                    col.missing_pct > 15 ? 'text-red-500' : (col.missing_pct > 0 ? 'text-amber-500' : 'text-emerald-500')
                  }`}>
                    {col.missing_pct}% nulls
                  </span>
                </div>

                <h4 className={`text-xs font-bold truncate mb-1 ${isStark ? 'text-[#00E5FF]' : 'text-slate-800'}`}>
                  {col.name}
                </h4>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 mb-3">
                  <div>Unique: <strong className="text-slate-700 dark:text-slate-200">{col.unique_count.toLocaleString()}</strong></div>
                  <div>Missing: <strong className="text-slate-700 dark:text-slate-200">{col.missing_count}</strong></div>
                  {col.mean_val !== null && col.mean_val !== undefined && (
                    <div>Mean: <strong className="text-slate-700 dark:text-slate-200">{col.mean_val}</strong></div>
                  )}
                  {col.median_val !== null && col.median_val !== undefined && (
                    <div>Median: <strong className="text-slate-700 dark:text-slate-200">{col.median_val}</strong></div>
                  )}
                </div>

                {/* Sparkline mini-histogram */}
                {col.sparkline && col.sparkline.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-cyan-500/20">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Distribution Sparkline</span>
                    <div className="flex items-end gap-1 h-8 w-full bg-slate-50 dark:bg-cyan-950/20 p-1 rounded">
                      {col.sparkline.map((val, idx) => {
                        const maxVal = Math.max(...col.sparkline, 1);
                        const heightPct = Math.max(12, Math.round((val / maxVal) * 100));
                        return (
                          <div
                            key={idx}
                            title={`Bin ${idx + 1}: ${val}`}
                            className={`flex-1 rounded-xs transition-all ${
                              isStark ? 'bg-cyan-400 hover:bg-cyan-300' : 'bg-indigo-500 hover:bg-indigo-600'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top frequent values preview */}
                {col.top_values && col.top_values.length > 0 && (!col.sparkline || col.sparkline.length === 0) && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-cyan-500/20">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Top Values</span>
                    <div className="space-y-1">
                      {col.top_values.slice(0, 3).map((tv, idx) => (
                        <div key={idx} className="flex justify-between text-[10px]">
                          <span className="truncate max-w-[130px] font-mono text-slate-600 dark:text-slate-300">
                            {tv.value || '<empty>'}
                          </span>
                          <span className="text-slate-400">{tv.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Raw Data Preview (First 100 rows virtualized / scrollable) */}
      <div className={`p-6 rounded-2xl border space-y-4 ${
        isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TableIcon className="w-4 h-4 text-indigo-500 dark:text-[#00E5FF]" />
            <h3 className={`text-sm font-bold ${isStark ? 'text-[#00E5FF]' : 'text-slate-900'}`}>
              Data Grid Preview (First 100 Rows)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Total {previewRows.length} sample rows displayed
          </span>
        </div>

        <div className="overflow-x-auto max-h-96 border rounded-xl dark:border-cyan-500/20">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 ${isStark ? 'bg-cyan-950/90 text-[#00E5FF]' : 'bg-slate-100 text-slate-700'}`}>
              <tr>
                {columns.map((c) => (
                  <th key={c.name} className="p-2.5 border-b font-medium whitespace-nowrap">
                    <div>{c.name}</div>
                    <span className="text-[10px] font-mono opacity-60">({c.inferred_type})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-cyan-950">
              {previewRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-cyan-500/5">
                  {columns.map((c) => (
                    <td key={c.name} className="p-2.5 whitespace-nowrap truncate max-w-xs font-mono text-[11px]">
                      {row[c.name] !== null && row[c.name] !== undefined ? String(row[c.name]) : (
                        <span className="text-red-400 italic">null</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
