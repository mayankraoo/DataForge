import React, { useState } from 'react';
import { useDatasetStore, ChartConfig } from '../stores/datasetStore';
import { useThemeStore } from '../stores/themeStore';
import { ChartCard } from './ChartCard';
import { 
  Plus, LayoutTemplate, Filter, Download, Sparkles, 
  ChevronRight, BarChart2, PieChart, LineChart, Hash
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const DashboardView: React.FC = () => {
  const { 
    activeCharts, addChart, removeChart, setCharts, 
    availableTemplates, profile, globalFilters, updateGlobalFilters 
  } = useDatasetStore();
  const { theme, playSound } = useThemeStore();
  const isStark = theme === 'stark';

  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('bar');
  const [newDim, setNewDim] = useState('');
  const [newMeasure, setNewMeasure] = useState('');
  const [newAgg, setNewAgg] = useState('sum');

  // Filter controls state
  const catColumns = profile?.columns.filter(c => c.inferred_type === 'category') || [];

  const handleApplyTemplate = (tmpl: any) => {
    playSound('click');
    setCharts(tmpl.charts);
  };

  const handleCreateChart = () => {
    playSound('click');
    const newCfg: ChartConfig = {
      id: `custom_${Date.now()}`,
      title: newTitle || `${newType.toUpperCase()} Chart`,
      chart_type: newType,
      dimension: newDim || undefined,
      measure: newMeasure || undefined,
      aggregation: newAgg,
      w: 6,
      h: 4,
      x: 0,
      y: 0
    };
    addChart(newCfg);
    setShowAddDrawer(false);
  };

  const exportAsImage = async () => {
    playSound('click');
    const element = document.getElementById('dashboard-canvas');
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imgData;
    link.download = 'dataforge_dashboard.png';
    link.click();
  };

  const exportAsPdf = async () => {
    playSound('click');
    const element = document.getElementById('dashboard-canvas');
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('landscape', 'pt', 'a4');
    pdf.addImage(imgData, 'PNG', 20, 20, 800, 480);
    pdf.save('dataforge_dashboard.pdf');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-6 animate-fadeIn">
      {/* Top Header: Templates & Export Controls */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
        isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h1 className={`text-2xl font-bold ${isStark ? 'text-[#00E5FF]' : 'text-slate-900'}`}>
            Interactive Visual Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#7FA3C7]">
            Auto-generated charts tailored to your data types. Apply global slicers to cross-filter all visualizations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={exportAsImage}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-all ${
              isStark ? 'border-cyan-500/30 text-[#00E5FF] hover:bg-cyan-500/10' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PNG</span>
          </button>

          <button
            onClick={exportAsPdf}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-all ${
              isStark ? 'border-cyan-500/30 text-[#00E5FF] hover:bg-cyan-500/10' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => { playSound('click'); setShowAddDrawer(!showAddDrawer); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 ${
              isStark ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Chart</span>
          </button>
        </div>
      </div>

      {/* Templates Selector Carousel */}
      {availableTemplates.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#7FA3C7] flex items-center gap-1.5">
            <LayoutTemplate className="w-3.5 h-3.5" />
            Pre-built Industry Templates
          </p>
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {availableTemplates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleApplyTemplate(tmpl)}
                className={`px-4 py-2 rounded-xl border text-xs font-medium whitespace-nowrap transition-all ${
                  isStark 
                    ? 'border-cyan-500/20 bg-cyan-950/20 text-[#00E5FF] hover:border-cyan-400/50' 
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/30'
                }`}
              >
                {tmpl.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Global Slicers & Filters Bar */}
      {catColumns.length > 0 && (
        <div className={`p-4 rounded-xl border flex flex-wrap items-center gap-4 text-xs ${
          isStark ? 'bg-cyan-950/20 border-cyan-500/20' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-[#7FA3C7]">
            <Filter className="w-3.5 h-3.5 text-indigo-500 dark:text-[#00E5FF]" />
            <span className="font-semibold text-slate-800 dark:text-cyan-200">Global Slicer:</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">{catColumns[0].name}:</span>
            <select
              onChange={(e) => {
                const val = e.target.value;
                updateGlobalFilters({
                  ...globalFilters,
                  category_filters: val ? { [catColumns[0].name]: [val] } : {}
                });
              }}
              className="p-1.5 rounded-lg border bg-transparent text-xs dark:border-cyan-500/30"
            >
              <option value="">All {catColumns[0].name}s</option>
              {catColumns[0].top_values.map((v) => (
                <option key={v.value} value={v.value} className="dark:bg-slate-900">{v.value}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Add Custom Chart Inline Drawer */}
      {showAddDrawer && (
        <div className={`p-5 rounded-2xl border space-y-4 animate-fadeIn text-xs ${
          isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-md'
        }`}>
          <h3 className="font-bold text-slate-800 dark:text-cyan-200">Configure New Chart</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Chart Title</label>
              <input
                type="text"
                placeholder="Title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full p-2 rounded-lg border bg-transparent dark:border-cyan-500/30"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Chart Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full p-2 rounded-lg border bg-transparent dark:border-cyan-500/30"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="donut">Donut Chart</option>
                <option value="kpi">KPI Metric Card</option>
                <option value="scatter">Scatter Plot</option>
                <option value="histogram">Histogram</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Dimension (X-Axis / Category)</label>
              <select
                value={newDim}
                onChange={(e) => setNewDim(e.target.value)}
                className="w-full p-2 rounded-lg border bg-transparent dark:border-cyan-500/30"
              >
                <option value="">None</option>
                {profile?.columns.map(c => (
                  <option key={c.name} value={c.name} className="dark:bg-slate-900">{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Measure (Numeric)</label>
              <select
                value={newMeasure}
                onChange={(e) => setNewMeasure(e.target.value)}
                className="w-full p-2 rounded-lg border bg-transparent dark:border-cyan-500/30"
              >
                <option value="">None</option>
                {profile?.columns.filter(c => ['integer', 'float', 'currency'].includes(c.inferred_type)).map(c => (
                  <option key={c.name} value={c.name} className="dark:bg-slate-900">{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreateChart}
                className="w-full py-2 rounded-lg bg-indigo-600 text-white dark:bg-cyan-500 dark:text-black font-bold"
              >
                Create Chart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Canvas Grid */}
      <div id="dashboard-canvas" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeCharts.map((cfg) => (
          <ChartCard
            key={cfg.id}
            config={cfg}
            onRemove={removeChart}
          />
        ))}
      </div>
    </div>
  );
};
