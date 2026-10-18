import React, { useState } from 'react';
import { useDatasetStore } from '../stores/datasetStore';
import { useThemeStore } from '../stores/themeStore';
import { 
  Upload, Database, FileSpreadsheet, ClipboardCopy, 
  Sparkles, CheckCircle2, AlertCircle, FileText, ArrowRight
} from 'lucide-react';
import axios from 'axios';

export const ImportView: React.FC = () => {
  const { loadSampleDataset, uploadFile, importFromSql, importFromKaggle, isLoading, error } = useDatasetStore();
  const { theme, playSound } = useThemeStore();
  const isStark = theme === 'stark';

  const [activeTab, setActiveTab] = useState<'upload' | 'sql' | 'kaggle' | 'paste' | 'samples'>('samples');
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [sqlConn, setSqlConn] = useState('sqlite:///./backend/storage/dataforge.db');
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM datasets LIMIT 10;');
  const [kaggleSlug, setKaggleSlug] = useState('unsds/world-happiness-report');
  const [kaggleUser, setKaggleUser] = useState('');
  const [kaggleKey, setKaggleKey] = useState('');

  const sampleFiles = [
    {
      id: 'sales_messy.csv',
      title: 'Retail Sales & Orders',
      filename: 'sales_messy.csv',
      rows: '2,049 rows',
      flaws: 'Mixed date formats, disguised nulls ("N/A"), duplicate order IDs, negative quantities, currency text symbols ($ & ₹), extreme outliers'
    },
    {
      id: 'employees_messy.xlsx',
      title: 'Corporate HR & Payroll (2 Sheets)',
      filename: 'employees_messy.xlsx',
      rows: '650 rows (2 sheets)',
      flaws: 'Employee info + salary sheets, negative age (-25), "50k" multipliers, whitespace variants in departments, constant columns'
    },
    {
      id: 'customers_messy.csv',
      title: 'Customer Directory & CRM',
      filename: 'customers_messy.csv',
      rows: '999 rows',
      flaws: 'Malformed email & phone numbers, duplicate customers with subtle typo variations (RapidFuzz), 98% empty legacy notes'
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      playSound('click');
      uploadFile(e.target.files[0]);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    playSound('click');
    const blob = new Blob([pastedText], { type: 'text/csv' });
    const file = new File([blob], 'pasted_data.csv', { type: 'text/csv' });
    await uploadFile(file);
  };

  const handleSqlSubmit = async () => {
    playSound('click');
    try {
      await importFromSql(sqlConn, sqlQuery);
    } catch {
      // error is automatically set in datasetStore
    }
  };

  const handleKaggleSubmit = async () => {
    playSound('click');
    try {
      await importFromKaggle(kaggleSlug, kaggleUser, kaggleKey);
    } catch {
      // error is automatically set in datasetStore
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="text-center space-y-2">
        <h1 className={`text-3xl font-extrabold tracking-tight ${isStark ? 'font-["Orbitron"] text-[#00E5FF]' : 'text-slate-900'}`}>
          Raw Data in. Ready-to-Use Dashboards out.
        </h1>
        <p className="text-sm text-slate-500 dark:text-[#7FA3C7] max-w-2xl mx-auto">
          Connect your messy data from CSVs, multi-sheet Excels, SQL queries, or Kaggle. 
          DataForge automatically infers types, catches every flaw, and generates clean dashboards in under 2 minutes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center border-b border-slate-200 dark:border-cyan-500/20 pb-2 space-x-2">
        {[
          { id: 'samples', label: 'Sample Datasets', icon: Sparkles },
          { id: 'upload', label: 'Upload File', icon: Upload },
          { id: 'sql', label: 'SQL Database', icon: Database },
          { id: 'kaggle', label: 'Kaggle Dataset', icon: FileSpreadsheet },
          { id: 'paste', label: 'Paste Data', icon: ClipboardCopy },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { playSound('click'); setActiveTab(tab.id as any); }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? isStark
                    ? 'bg-cyan-500/20 text-[#00E5FF] border border-cyan-400/50 shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                    : 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-[#7FA3C7] dark:hover:text-cyan-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-xs flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab 1: Instant Sample Datasets */}
      {activeTab === 'samples' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {sampleFiles.map((s) => (
              <div
                key={s.id}
                className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                  isStark 
                    ? 'hud-panel hover:border-cyan-400/60 hover:shadow-[0_0_16px_rgba(0,229,255,0.25)]' 
                    : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-cyan-950/60 text-indigo-700 dark:text-cyan-300 border border-indigo-100 dark:border-cyan-800">
                      {s.rows}
                    </span>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <h3 className={`text-base font-bold mb-2 ${isStark ? 'text-[#00E5FF]' : 'text-slate-800'}`}>
                    {s.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#7FA3C7] leading-relaxed mb-4">
                    <strong className="text-slate-700 dark:text-cyan-200">Seeded issues:</strong> {s.flaws}
                  </p>
                </div>

                <button
                  disabled={isLoading || loadingSample !== null}
                  onClick={async () => { 
                    playSound('click'); 
                    setLoadingSample(s.filename);
                    try {
                      await loadSampleDataset(s.filename); 
                    } finally {
                      setLoadingSample(null);
                    }
                  }}
                  className={`w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition-all ${
                    isStark
                      ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                  }`}
                >
                  {loadingSample === s.filename ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Profiling dataset...
                    </span>
                  ) : (
                    <>
                      <span>Load Dataset</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: File Upload */}
      {activeTab === 'upload' && (
        <div className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
          isStark ? 'border-cyan-500/40 bg-cyan-950/10' : 'border-slate-300 bg-slate-50/50 hover:bg-indigo-50/20'
        }`}>
          <div className="max-w-md mx-auto space-y-4">
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
              isStark ? 'bg-cyan-500/20 text-[#00E5FF]' : 'bg-indigo-100 text-indigo-600'
            }`}>
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800 dark:text-cyan-200">
                Drag and drop your files here, or browse
              </p>
              <p className="text-xs text-slate-400 dark:text-[#7FA3C7] mt-1">
                Supports CSV, TSV, XLSX, XLS (multi-sheet), JSON, and Parquet up to 200MB
              </p>
            </div>
            <label className={`inline-block px-5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer transition-all ${
              isStark
                ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}>
              Browse Files
              <input 
                type="file" 
                className="hidden" 
                accept=".csv,.tsv,.xlsx,.xls,.json,.parquet"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>
      )}

      {/* Tab 3: SQL */}
      {activeTab === 'sql' && (
        <div className={`p-6 rounded-2xl border space-y-4 ${
          isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <h3 className="text-sm font-bold text-slate-800 dark:text-cyan-200">SQL Database Connection (Read-Only)</h3>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-[#7FA3C7] mb-1">Connection String</label>
            <input 
              type="text" 
              value={sqlConn} 
              onChange={(e) => setSqlConn(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border bg-transparent font-mono dark:border-cyan-500/30" 
              placeholder="sqlite:///sample.db or postgresql://user:pass@host/db"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-[#7FA3C7] mb-1">SELECT Query</label>
            <textarea 
              rows={3} 
              value={sqlQuery} 
              onChange={(e) => setSqlQuery(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border bg-transparent font-mono dark:border-cyan-500/30"
              placeholder="SELECT * FROM table LIMIT 100;"
            />
          </div>
          <button
            onClick={handleSqlSubmit}
            className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-indigo-600 text-white dark:bg-cyan-500 dark:text-black"
          >
            Run Read-Only Query
          </button>
        </div>
      )}

      {/* Tab 4: Kaggle */}
      {activeTab === 'kaggle' && (
        <div className={`p-6 rounded-2xl border space-y-4 ${
          isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <h3 className="text-sm font-bold text-slate-800 dark:text-cyan-200">Import from Kaggle</h3>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-[#7FA3C7] mb-1">Dataset Slug</label>
            <input 
              type="text" 
              value={kaggleSlug} 
              onChange={(e) => setKaggleSlug(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border bg-transparent font-mono dark:border-cyan-500/30" 
              placeholder="e.g. owner/dataset-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-[#7FA3C7] mb-1">Kaggle Username (Optional)</label>
              <input 
                type="text" 
                value={kaggleUser} 
                onChange={(e) => setKaggleUser(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border bg-transparent font-mono dark:border-cyan-500/30" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-[#7FA3C7] mb-1">Kaggle API Key (Optional)</label>
              <input 
                type="password" 
                value={kaggleKey} 
                onChange={(e) => setKaggleKey(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border bg-transparent font-mono dark:border-cyan-500/30" 
              />
            </div>
          </div>
          <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-cyan-950/30 border border-indigo-100 dark:border-cyan-500/20 text-xs text-slate-600 dark:text-[#7FA3C7] space-y-1">
            <p className="font-semibold text-slate-800 dark:text-cyan-200">How to get your Kaggle API key (100% Free):</p>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
              <li>Log in to <a href="https://www.kaggle.com/settings" target="_blank" rel="noreferrer" className="underline text-indigo-600 dark:text-cyan-400">kaggle.com/settings</a></li>
              <li>Scroll to <strong>API</strong> and click <strong>Create New Token</strong> (downloads <code>kaggle.json</code>)</li>
              <li>Paste your username and the key here, or download the dataset from Kaggle directly and drop it into <strong>Upload File</strong>.</li>
            </ol>
          </div>
          <button
            disabled={isLoading}
            onClick={handleKaggleSubmit}
            className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-indigo-600 text-white dark:bg-cyan-500 dark:text-black hover:opacity-90 transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Downloading from Kaggle...</span>
              </>
            ) : (
              <span>Download Kaggle Dataset</span>
            )}
          </button>
        </div>
      )}

      {/* Tab 5: Paste Data */}
      {activeTab === 'paste' && (
        <div className={`p-6 rounded-2xl border space-y-4 ${
          isStark ? 'hud-panel' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <h3 className="text-sm font-bold text-slate-800 dark:text-cyan-200">Paste Raw CSV / Delimited Text</h3>
          <textarea 
            rows={8}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="OrderID,Customer,Amount&#10;101,John Doe,500&#10;102,Jane Smith,850"
            className="w-full text-xs p-3 rounded-lg border bg-transparent font-mono dark:border-cyan-500/30"
          />
          <button
            onClick={handlePasteSubmit}
            className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-indigo-600 text-white dark:bg-cyan-500 dark:text-black"
          >
            Parse Pasted Table
          </button>
        </div>
      )}
    </div>
  );
};
