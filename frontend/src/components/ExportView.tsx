import React from 'react';
import { useDatasetStore } from '../stores/datasetStore';
import { useThemeStore } from '../stores/themeStore';
import { 
  Download, FileSpreadsheet, FileText, Database, 
  ExternalLink, CheckCircle2, ShieldCheck, Sparkles, FolderArchive
} from 'lucide-react';

export const ExportView: React.FC = () => {
  const { activeDatasetId, profile } = useDatasetStore();
  const { theme, playSound } = useThemeStore();
  const isStark = theme === 'stark';

  if (!activeDatasetId) return null;

  const handleDownload = (format: string) => {
    playSound('success');
    window.open(`/api/datasets/${activeDatasetId}/export?format=${format}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className={`text-3xl font-extrabold tracking-tight ${isStark ? 'font-["Orbitron"] text-[#00E5FF]' : 'text-slate-900'}`}>
          Export Clean Data & Power BI Handoff
        </h1>
        <p className="text-sm text-slate-500 dark:text-[#7FA3C7] max-w-xl mx-auto">
          Download your cleaned dataset in high-performance open formats or export the complete, production-ready Power BI Handoff ZIP package.
        </p>
      </div>

      {/* Featured Card: Power BI Handoff ZIP */}
      <div className={`p-8 rounded-3xl border relative overflow-hidden transition-all ${
        isStark 
          ? 'hud-panel border-cyan-400/50 shadow-[0_0_24px_rgba(0,229,255,0.25)]' 
          : 'bg-linear-to-br from-indigo-50/50 to-white border-indigo-200 shadow-md'
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                OFFICIAL HANDOFF SPECIFICATION
              </span>
            </div>
            <h2 className={`text-2xl font-bold ${isStark ? 'text-[#00E5FF]' : 'text-slate-900'}`}>
              Send to Power BI Export Package (.ZIP)
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#7FA3C7] leading-relaxed">
              Contains everything needed for immediate enterprise BI modeling:
            </p>
            <ul className="text-xs text-slate-500 dark:text-slate-300 space-y-1.5 list-disc list-inside">
              <li>Cleaned CSV, Excel (.xlsx), and Apache Parquet files</li>
              <li>Markdown & CSV Data Dictionary with semantic types</li>
              <li>Suggested Star-Schema Dimension tables (Dim_Customers, Dim_Products, Dim_Date)</li>
              <li>Starter DAX Measures (Total, Average, YTD, Prior Period)</li>
              <li>Power Query M script for reproducible transformations</li>
              <li>Step-by-step <code>HOW_TO_OPEN_IN_POWER_BI.md</code> walkthrough</li>
            </ul>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={() => handleDownload('powerbi')}
              className={`px-8 py-4 rounded-2xl font-bold text-sm flex items-center space-x-3 shadow-lg transition-all ${
                isStark
                  ? 'bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_18px_rgba(0,229,255,0.5)]'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              <FolderArchive className="w-5 h-5" />
              <span>Download Power BI ZIP</span>
            </button>
            <span className="text-[10px] text-slate-400 mt-2 font-mono">1-Click Bundled Package</span>
          </div>
        </div>
      </div>

      {/* Individual File Formats */}
      <div className="space-y-4">
        <h3 className={`text-base font-bold ${isStark ? 'text-[#00E5FF]' : 'text-slate-900'}`}>
          Direct Dataset Downloads
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* CSV */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between ${
            isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-cyan-200">Standard CSV</h4>
              <p className="text-xs text-slate-400 mt-1">UTF-8 encoded flat file compatible with Excel, Tableau, and Python.</p>
            </div>
            <button
              onClick={() => handleDownload('csv')}
              className="mt-6 w-full py-2.5 rounded-xl border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-cyan-950/40"
            >
              Download CSV
            </button>
          </div>

          {/* Excel */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between ${
            isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-cyan-200">Excel Workbook (.xlsx)</h4>
              <p className="text-xs text-slate-400 mt-1">Ready-to-use formatted spreadsheet for Microsoft Excel and Google Sheets.</p>
            </div>
            <button
              onClick={() => handleDownload('xlsx')}
              className="mt-6 w-full py-2.5 rounded-xl border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-cyan-950/40"
            >
              Download XLSX
            </button>
          </div>

          {/* Parquet */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between ${
            isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-cyan-200">Apache Parquet</h4>
              <p className="text-xs text-slate-400 mt-1">Columnar binary storage for high-speed Big Data, DuckDB, and Spark pipelines.</p>
            </div>
            <button
              onClick={() => handleDownload('parquet')}
              className="mt-6 w-full py-2.5 rounded-xl border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-cyan-950/40"
            >
              Download Parquet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
