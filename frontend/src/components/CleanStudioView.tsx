import React, { useState } from 'react';
import { useDatasetStore } from '../stores/datasetStore';
import { useThemeStore } from '../stores/themeStore';
import { 
  Sparkles, Check, Undo2, Code2, ArrowRight, CheckCircle2, 
  Settings2, Plus, RefreshCw, Eye, Download, History
} from 'lucide-react';
import axios from 'axios';

export const CleanStudioView: React.FC = () => {
  const { 
    profile, previousProfile, applyAutoClean, applySelectedCleanActions, applySingleCleanAction, undoAction,
    cleaningHistory, setCurrentStep, isLoading, activeDatasetId
  } = useDatasetStore();
  const { theme, playSound } = useThemeStore();
  const isStark = theme === 'stark';

  const [recipeFormat, setRecipeFormat] = useState<'python' | 'sql' | 'm'>('python');
  const [recipes, setRecipes] = useState<{ python: string; sql: string; power_query_m: string } | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  // Manual tools state
  const [manualTool, setManualTool] = useState<'rename' | 'drop' | 'change_type' | 'split' | 'find_replace' | 'filter' | 'derive' | null>(null);
  const [selectedCol, setSelectedCol] = useState('');
  const [newColName, setNewColName] = useState('');
  const [targetType, setTargetType] = useState('float');
  const [splitDelimiter, setSplitDelimiter] = useState(' ');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [filterOperator, setFilterOperator] = useState('equals');
  const [filterVal, setFilterVal] = useState('');
  const [deriveFormula, setDeriveFormula] = useState('');
  const [dismissedIssueIds, setDismissedIssueIds] = useState<string[]>([]);
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);

  if (!profile) return null;

  const visibleIssues = profile.issues.filter((i) => !dismissedIssueIds.includes(i.id));
  const currentScore = profile.health_score.overall;
  const previousScore = previousProfile?.health_score.overall;

  const toggleSelectIssue = (id: string) => {
    playSound('click');
    if (selectedIssueIds.includes(id)) {
      setSelectedIssueIds(selectedIssueIds.filter((x) => x !== id));
    } else {
      setSelectedIssueIds([...selectedIssueIds, id]);
    }
  };

  const handleApplySelected = async () => {
    playSound('success');
    const actions = visibleIssues
      .filter((i) => selectedIssueIds.includes(i.id))
      .map((i) => ({
        action_type: i.action_type,
        column: i.column,
        params: i.metadata || {},
        description: i.suggested_action
      }));
    if (actions.length > 0) {
      await applySelectedCleanActions(actions);
    }
  };

  const fetchRecipes = async () => {
    playSound('click');
    if (!activeDatasetId) return;
    try {
      const res = await axios.get(`/api/datasets/${activeDatasetId}/recipe`);
      setRecipes(res.data);
      setShowRecipeModal(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleManualRename = async () => {
    if (!selectedCol || !newColName.trim()) return;
    playSound('click');
    await applySingleCleanAction({
      action_type: 'rename_column',
      column: selectedCol,
      params: { new_name: newColName.trim() },
      description: `Rename column '${selectedCol}' to '${newColName.trim()}'`
    });
    setManualTool(null);
    setSelectedCol('');
    setNewColName('');
  };

  const handleManualDrop = async () => {
    if (!selectedCol) return;
    playSound('click');
    await applySingleCleanAction({
      action_type: 'drop_column',
      column: selectedCol,
      params: {},
      description: `Drop column '${selectedCol}'`
    });
    setManualTool(null);
    setSelectedCol('');
  };

  const handleManualChangeType = async () => {
    if (!selectedCol) return;
    playSound('click');
    await applySingleCleanAction({
      action_type: 'change_type',
      column: selectedCol,
      params: { target_type: targetType },
      description: `Change '${selectedCol}' type to ${targetType}`
    });
    setManualTool(null);
  };

  const handleManualSplit = async () => {
    if (!selectedCol) return;
    playSound('click');
    await applySingleCleanAction({
      action_type: 'split_column',
      column: selectedCol,
      params: { delimiter: splitDelimiter, new_col1: `${selectedCol}_part1`, new_col2: `${selectedCol}_part2` },
      description: `Split '${selectedCol}' by '${splitDelimiter}'`
    });
    setManualTool(null);
  };

  const handleManualFindReplace = async () => {
    if (!selectedCol || !findText) return;
    playSound('click');
    await applySingleCleanAction({
      action_type: 'find_replace',
      column: selectedCol,
      params: { find: findText, replace: replaceText },
      description: `Replace '${findText}' with '${replaceText}' in '${selectedCol}'`
    });
    setManualTool(null);
    setFindText('');
    setReplaceText('');
  };

  const handleManualFilter = async () => {
    if (!selectedCol || !filterVal) return;
    playSound('click');
    await applySingleCleanAction({
      action_type: 'filter_rows',
      column: selectedCol,
      params: { operator: filterOperator, value: filterVal },
      description: `Filter rows on '${selectedCol}' ${filterOperator} '${filterVal}'`
    });
    setManualTool(null);
    setFilterVal('');
  };

  const handleManualDerive = async () => {
    if (!newColName.trim() || !deriveFormula.trim()) return;
    playSound('click');
    await applySingleCleanAction({
      action_type: 'derive_formula',
      params: { new_col_name: newColName.trim(), formula: deriveFormula.trim() },
      description: `Derive '${newColName.trim()}' = ${deriveFormula.trim()}`
    });
    setManualTool(null);
    setNewColName('');
    setDeriveFormula('');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-8 animate-fadeIn">
      {/* Top Banner: Score Delta & Auto-Clean Action */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 ${
        isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className={`text-2xl font-bold ${isStark ? 'text-[#00E5FF]' : 'text-slate-900'}`}>
              Smart Cleaning Studio
            </h1>
            {previousScore !== undefined && previousScore !== currentScore && (
              <span className="px-2.5 py-0.5 rounded-full font-bold text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                Score: {previousScore} → {currentScore} (+{currentScore - previousScore})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-[#7FA3C7]">
            Approve recommended transformations, review before/after diffs, and inspect generated reproducible code.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => { playSound('click'); undoAction(); }}
            disabled={isLoading || cleaningHistory.length === 0}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
              cleaningHistory.length === 0 || isLoading
                ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                : isStark 
                ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10' 
                : 'border-amber-300 text-amber-700 hover:bg-amber-50'
            }`}
            title="Undo last cleaning step"
          >
            <Undo2 className="w-4 h-4" />
            <span>Undo Step</span>
          </button>

          <button
            onClick={fetchRecipes}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 border transition-all ${
              isStark 
                ? 'border-cyan-500/40 text-[#00E5FF] hover:bg-cyan-500/10' 
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Export Recipe</span>
          </button>

          {selectedIssueIds.filter(id => visibleIssues.some(i => i.id === id)).length > 0 && selectedIssueIds.filter(id => visibleIssues.some(i => i.id === id)).length < visibleIssues.length && (
            <button
              disabled={isLoading}
              onClick={handleApplySelected}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md ${
                isStark
                  ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Apply Selected ({selectedIssueIds.filter(id => visibleIssues.some(i => i.id === id)).length})</span>
            </button>
          )}

          <button
            disabled={isLoading || visibleIssues.length === 0}
            onClick={() => { playSound('success'); applyAutoClean(); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md ${
              isStark
                ? 'bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_14px_rgba(0,229,255,0.4)]'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoading ? 'Cleaning...' : 'Auto-Clean All'}</span>
          </button>

          <button
            onClick={() => { playSound('click'); setCurrentStep('dashboard'); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
              isStark
                ? 'border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title="Leave remaining data untouched and build dashboard"
          >
            <span>Keep As Is & Finish</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Manual Cleaning Toolbar */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
        isStark ? 'bg-cyan-950/20 border-cyan-500/20' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center space-x-2 text-slate-500 dark:text-[#7FA3C7]">
          <Settings2 className="w-4 h-4 text-indigo-500 dark:text-[#00E5FF]" />
          <span className="font-semibold text-slate-800 dark:text-cyan-200">Manual Tools:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'rename', label: 'Rename' },
            { id: 'change_type', label: 'Change Type' },
            { id: 'split', label: 'Split Column' },
            { id: 'find_replace', label: 'Find & Replace' },
            { id: 'filter', label: 'Filter Rows' },
            { id: 'derive', label: 'Derive Column' },
            { id: 'drop', label: 'Drop Column', danger: true },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { playSound('click'); setManualTool(manualTool === t.id ? null : t.id as any); }}
              className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                manualTool === t.id
                  ? isStark ? 'bg-cyan-500 text-black border-cyan-400 font-bold' : 'bg-indigo-600 text-white border-indigo-600'
                  : t.danger
                  ? 'text-red-500 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30'
                  : 'border-slate-200 dark:border-cyan-500/30 hover:bg-slate-100 dark:hover:bg-cyan-950/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Operation Inline Drawer */}
      {manualTool && (
        <div className={`p-5 rounded-xl border space-y-3 animate-fadeIn text-xs ${
          isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-cyan-200 uppercase tracking-wider text-[11px]">
              Tool: {manualTool.replace('_', ' ')}
            </span>
            <button onClick={() => setManualTool(null)} className="text-slate-400 hover:text-slate-600">✕ Close</button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {manualTool !== 'derive' && (
              <select
                value={selectedCol}
                onChange={(e) => setSelectedCol(e.target.value)}
                className="p-2 rounded-lg border bg-transparent dark:border-cyan-500/30 text-xs min-w-[160px]"
              >
                <option value="">Select Column...</option>
                {profile.columns.map((c) => (
                  <option key={c.name} value={c.name} className="dark:bg-slate-900">{c.name}</option>
                ))}
              </select>
            )}

            {manualTool === 'rename' && (
              <input
                type="text"
                placeholder="New Column Name..."
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className="p-2 rounded-lg border bg-transparent dark:border-cyan-500/30 text-xs"
              />
            )}

            {manualTool === 'change_type' && (
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="p-2 rounded-lg border bg-transparent dark:border-cyan-500/30 text-xs"
              >
                <option value="float" className="dark:bg-slate-900">Float (Numeric)</option>
                <option value="integer" className="dark:bg-slate-900">Integer</option>
                <option value="string" className="dark:bg-slate-900">String / Text</option>
                <option value="datetime" className="dark:bg-slate-900">Date (YYYY-MM-DD)</option>
              </select>
            )}

            {manualTool === 'split' && (
              <input
                type="text"
                placeholder="Delimiter (e.g. space or comma)"
                value={splitDelimiter}
                onChange={(e) => setSplitDelimiter(e.target.value)}
                className="p-2 rounded-lg border bg-transparent dark:border-cyan-500/30 text-xs w-48"
              />
            )}

            {manualTool === 'find_replace' && (
              <>
                <input
                  type="text"
                  placeholder="Find text..."
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="p-2 rounded-lg border bg-transparent dark:border-cyan-500/30 text-xs w-40"
                />
                <input
                  type="text"
                  placeholder="Replace with..."
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="p-2 rounded-lg border bg-transparent dark:border-cyan-500/30 text-xs w-40"
                />
              </>
            )}

            {manualTool === 'filter' && (
              <>
                <select
                  value={filterOperator}
                  onChange={(e) => setFilterOperator(e.target.value)}
                  className="p-2 rounded-lg border bg-transparent dark:border-cyan-500/30 text-xs"
                >
                  <option value="equals" className="dark:bg-slate-900">Equals (==)</option>
                  <option value="not_equals" className="dark:bg-slate-900">Not Equals (!=)</option>
                  <option value="contains" className="dark:bg-slate-900">Contains</option>
                  <option value="greater_than" className="dark:bg-slate-900">Greater Than (&gt;)</option>
                  <option value="less_than" className="dark:bg-slate-900">Less Than (&lt;)</option>
                </select>
                <input
                  type="text"
                  placeholder="Filter value..."
                  value={filterVal}
                  onChange={(e) => setFilterVal(e.target.value)}
                  className="p-2 rounded-lg border bg-transparent dark:border-cyan-500/30 text-xs w-44"
                />
              </>
            )}

            {manualTool === 'derive' && (
              <>
                <input
                  type="text"
                  placeholder="New Column Name (e.g. TotalCost)"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="p-2 rounded-lg border bg-transparent dark:border-cyan-500/30 text-xs w-48"
                />
                <input
                  type="text"
                  placeholder="Formula (e.g. Quantity * UnitPrice)"
                  value={deriveFormula}
                  onChange={(e) => setDeriveFormula(e.target.value)}
                  className="p-2 rounded-lg border bg-transparent dark:border-cyan-500/30 text-xs flex-1 min-w-[200px]"
                />
              </>
            )}

            <button
              onClick={() => {
                if (manualTool === 'rename') handleManualRename();
                else if (manualTool === 'drop') handleManualDrop();
                else if (manualTool === 'change_type') handleManualChangeType();
                else if (manualTool === 'split') handleManualSplit();
                else if (manualTool === 'find_replace') handleManualFindReplace();
                else if (manualTool === 'filter') handleManualFilter();
                else if (manualTool === 'derive') handleManualDerive();
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white dark:bg-cyan-500 dark:text-black font-semibold text-xs transition-all shadow-xs"
            >
              Apply Action
            </button>
          </div>
        </div>
      )}

      {/* Issues Progress & Guidance Header */}
      {visibleIssues.length > 0 && (
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${
          isStark ? 'bg-cyan-950/20 border-cyan-500/30' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-cyan-200">
                Fix Queue: {visibleIssues.length} Issues Remaining
              </span>
              <div className="flex items-center gap-1.5">
                {visibleIssues.filter(i => i.severity === 'Critical').length > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/30">
                    {visibleIssues.filter(i => i.severity === 'Critical').length} Critical
                  </span>
                )}
                {visibleIssues.filter(i => i.severity === 'Warning').length > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                    {visibleIssues.filter(i => i.severity === 'Warning').length} Warnings
                  </span>
                )}
                {visibleIssues.filter(i => i.severity === 'Info').length > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/30">
                    {visibleIssues.filter(i => i.severity === 'Info').length} Info
                  </span>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#7FA3C7]">
              💡 <strong>Batch Resolution:</strong> Each card fixes <strong>all affected rows in that column in 1 click</strong>. To resolve everything at once, click <strong>"Auto-Clean All Issues"</strong> above.
            </p>
          </div>

          {(visibleIssues.length + cleaningHistory.length) > 0 && (
            <div className="min-w-[180px] space-y-1">
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-cyan-300">
                <span>Cleaning Progress</span>
                <span>{cleaningHistory.length}/{visibleIssues.length + cleaningHistory.length}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-cyan-950 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 dark:bg-[#00E5FF] h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.round((cleaningHistory.length / (visibleIssues.length + cleaningHistory.length)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggested Fixes Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className={`text-base font-bold ${isStark ? 'text-[#00E5FF]' : 'text-slate-900'}`}>
            Pending Fix Recommendations ({visibleIssues.length})
          </h3>

          {visibleIssues.length > 0 && (
            <div className="flex items-center space-x-3 text-xs">
              <button
                onClick={() => { playSound('click'); setSelectedIssueIds(visibleIssues.map(i => i.id)); }}
                className="text-xs font-semibold text-indigo-600 dark:text-cyan-400 hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-cyan-800">|</span>
              <button
                onClick={() => { playSound('click'); setSelectedIssueIds([]); }}
                className="text-xs font-semibold text-slate-500 dark:text-[#7FA3C7] hover:underline"
              >
                Deselect All (Keep As Is)
              </button>
            </div>
          )}
        </div>

        {visibleIssues.length === 0 ? (
          <div className={`p-12 text-center rounded-2xl border ${isStark ? 'hud-panel' : 'bg-white border-slate-200'}`}>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800 dark:text-cyan-200">All Changes Reviewed!</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Your dataset is ready. You can build charts, visualize relationships, or export to Power BI.
            </p>
            <button
              onClick={() => { playSound('click'); setCurrentStep('dashboard'); }}
              className="mt-6 px-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white dark:bg-cyan-500 dark:text-black inline-flex items-center space-x-2"
            >
              <span>Build Dashboards</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                  isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedIssueIds.includes(issue.id)}
                        onChange={() => toggleSelectIssue(issue.id)}
                        className="w-4 h-4 rounded text-indigo-600 dark:text-cyan-400 focus:ring-0 cursor-pointer"
                        title="Check to fix, uncheck to keep data as is"
                      />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                        {issue.severity}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-400 dark:text-[#7FA3C7]">
                      {issue.column || 'Dataset Wide'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-800 dark:text-cyan-200 mb-1">
                    {issue.description}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-[#7FA3C7] mb-2">
                    Affects: <strong>{issue.affected_rows_count.toLocaleString()} rows</strong> ({issue.affected_rows_pct}%)
                  </p>

                  {(issue as any).sample_rows && (issue as any).sample_rows.length > 0 && (
                    <div className="text-[10px] font-mono text-slate-500 dark:text-[#7FA3C7] mb-3 flex flex-wrap items-center gap-1">
                      <span className="font-semibold text-slate-700 dark:text-cyan-300">Detected in rows:</span>
                      <span>
                        {(issue as any).sample_rows.map((r: number) => `#${r}`).join(', ')}
                        {issue.affected_rows_count > (issue as any).sample_rows.length && ` (+${(issue.affected_rows_count - (issue as any).sample_rows.length).toLocaleString()} more rows)`}
                      </span>
                    </div>
                  )}

                  {issue.before_after_sample.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-cyan-950/30 border dark:border-cyan-500/20 text-[11px] font-mono space-y-1 mb-4">
                      <div className="text-red-500 line-through">
                        Raw: {issue.before_after_sample[0].before}
                      </div>
                      <div className="text-emerald-500">
                        Target: {issue.before_after_sample[0].after}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-cyan-500/20">
                  <span className="text-[11px] text-slate-400">
                    Fix: {issue.suggested_action}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        playSound('click');
                        setDismissedIssueIds([...dismissedIssueIds, issue.id]);
                        setSelectedIssueIds(selectedIssueIds.filter((x) => x !== issue.id));
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-[#7FA3C7] dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-cyan-950/40 transition-all border border-slate-200 dark:border-cyan-500/20"
                      title="Leave this data untouched without modifying rows"
                    >
                      Keep As Is
                    </button>
                    <button
                      disabled={isLoading}
                      onClick={() => {
                        playSound('click');
                        applySingleCleanAction({
                          action_type: issue.action_type,
                          column: issue.column,
                          params: issue.metadata || {},
                          description: issue.suggested_action
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                        isStark 
                          ? 'bg-cyan-500/20 text-[#00E5FF] hover:bg-cyan-500/30 border border-cyan-400/40' 
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {issue.affected_rows_count > 1 
                          ? `Fix All ${issue.affected_rows_count.toLocaleString()} Rows` 
                          : 'Fix Issue'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Applied Cleaning History Timeline */}
      {cleaningHistory.length > 0 && (
        <div className={`p-6 rounded-2xl border space-y-4 ${
          isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-indigo-500 dark:text-[#00E5FF]" />
            <h3 className={`text-sm font-bold ${isStark ? 'text-[#00E5FF]' : 'text-slate-900'}`}>
              Applied Cleaning History ({cleaningHistory.length} steps)
            </h3>
          </div>

          <div className="space-y-2">
            {cleaningHistory.map((h, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-cyan-950/20 border border-slate-100 dark:border-cyan-500/10 text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-mono font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="text-slate-800 dark:text-cyan-200">{h.description}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{h.action_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipe Export Modal */}
      {showRecipeModal && recipes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-6 animate-fadeIn">
          <div className={`w-full max-w-3xl rounded-2xl p-6 border max-h-[85vh] flex flex-col justify-between ${
            isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-2xl'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Code2 className="w-5 h-5 text-indigo-500 dark:text-[#00E5FF]" />
                  <h3 className={`text-base font-bold ${isStark ? 'text-[#00E5FF]' : 'text-slate-900'}`}>
                    Reproducible Cleaning Recipe
                  </h3>
                </div>
                <button 
                  onClick={() => setShowRecipeModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-cyan-300 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Format Switcher */}
              <div className="flex space-x-2 border-b border-slate-200 dark:border-cyan-500/20 pb-3 mb-4">
                {(['python', 'sql', 'm'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => { playSound('click'); setRecipeFormat(fmt); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                      recipeFormat === fmt
                        ? isStark
                          ? 'bg-cyan-500/20 text-[#00E5FF] border border-cyan-400/40'
                          : 'bg-indigo-600 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-[#7FA3C7]'
                    }`}
                  >
                    {fmt === 'python' ? 'Python (Pandas)' : (fmt === 'sql' ? 'SQL' : 'Power Query (M)')}
                  </button>
                ))}
              </div>

              {/* Code display */}
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 dark:bg-black/90 text-xs font-mono overflow-auto max-h-96 border border-slate-800 dark:border-cyan-500/30">
                {recipeFormat === 'python' ? recipes.python : (recipeFormat === 'sql' ? recipes.sql : recipes.power_query_m)}
              </pre>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-cyan-500/20 flex justify-end">
              <button
                onClick={() => {
                  const text = recipeFormat === 'python' ? recipes.python : (recipeFormat === 'sql' ? recipes.sql : recipes.power_query_m);
                  navigator.clipboard.writeText(text);
                  alert('Recipe copied to clipboard!');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white dark:bg-cyan-500 dark:text-black"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
