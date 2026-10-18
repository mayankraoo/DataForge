import { create } from 'zustand';
import axios from 'axios';

export interface ColumnProfile {
  name: string;
  inferred_type: string;
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  cardinality_ratio: number;
  min_val?: number | null;
  max_val?: number | null;
  mean_val?: number | null;
  median_val?: number | null;
  std_val?: number | null;
  skewness?: number | null;
  top_values: Array<{ value: string; count: number; pct: number }>;
  sample_values: any[];
  sparkline: number[];
}

export interface DataIssue {
  id: string;
  column?: string | null;
  issue_type: string;
  severity: 'Critical' | 'Warning' | 'Info';
  description: string;
  affected_rows_count: number;
  affected_rows_pct: number;
  suggested_action: string;
  action_type: string;
  options: Array<{ label: string; value: string }>;
  before_after_sample: Array<{ before: string; after: string }>;
  metadata: Record<string, any>;
}

export interface HealthScoreBreakdown {
  overall: number;
  completeness: number;
  uniqueness: number;
  validity: number;
  consistency: number;
}

export interface ProfileReport {
  dataset_id: string;
  dataset_name: string;
  total_rows: number;
  total_columns: number;
  file_size_bytes: number;
  is_sampled: boolean;
  sample_rows?: number | null;
  health_score: HealthScoreBreakdown;
  narrative_summary: string;
  top_problems: string[];
  columns: ColumnProfile[];
  issues: DataIssue[];
  created_at: string;
}

export interface ChartConfig {
  id: string;
  title: string;
  chart_type: string;
  dimension?: string;
  measure?: string;
  aggregation?: string;
  sort_by?: string;
  top_n?: number;
  color?: string;
  w: number;
  h: number;
  x: number;
  y: number;
}

export interface DatasetState {
  currentStep: 'import' | 'profile' | 'clean' | 'dashboard' | 'export';
  activeDatasetId: string | null;
  datasetName: string | null;
  totalRows: number;
  totalCols: number;
  previewRows: any[];
  previewCols: Array<{ name: string; type: string }>;
  profile: ProfileReport | null;
  previousProfile: ProfileReport | null;
  cleaningHistory: Array<{ action_type: string; description: string; column?: string }>;
  activeCharts: ChartConfig[];
  availableTemplates: any[];
  globalFilters: {
    date_ranges: Record<string, [string | null, string | null]>;
    category_filters: Record<string, string[]>;
    numeric_ranges: Record<string, [number | null, number | null]>;
  };
  isLoading: boolean;
  error: string | null;

  setCurrentStep: (step: 'import' | 'profile' | 'clean' | 'dashboard' | 'export') => void;
  loadSampleDataset: (filename: string) => Promise<void>;
  uploadFile: (file: File, sheetName?: string) => Promise<void>;
  importFromSql: (connectionString: string, query: string) => Promise<void>;
  importFromKaggle: (slug: string, username?: string, apiKey?: string) => Promise<void>;
  fetchPreviewAndProfile: (datasetId: string, name: string) => Promise<void>;
  applyAutoClean: () => Promise<void>;
  applySelectedCleanActions: (actions: any[]) => Promise<void>;
  applySingleCleanAction: (action: any) => Promise<void>;
  undoAction: () => Promise<void>;
  setCharts: (charts: ChartConfig[]) => void;
  addChart: (chart: ChartConfig) => void;
  removeChart: (chartId: string) => void;
  updateGlobalFilters: (filters: any) => void;
}

export const useDatasetStore = create<DatasetState>((set, get) => ({
  currentStep: 'import',
  activeDatasetId: null,
  datasetName: null,
  totalRows: 0,
  totalCols: 0,
  previewRows: [],
  previewCols: [],
  profile: null,
  previousProfile: null,
  cleaningHistory: [],
  activeCharts: [],
  availableTemplates: [],
  globalFilters: {
    date_ranges: {},
    category_filters: {},
    numeric_ranges: {}
  },
  isLoading: false,
  error: null,

  setCurrentStep: (step) => set({ currentStep: step }),

  loadSampleDataset: async (filename: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(`/api/datasets/load-sample?filename=${encodeURIComponent(filename)}`);
      const { dataset_id, name, rows, cols } = res.data;
      set({ activeDatasetId: dataset_id, datasetName: name, totalRows: rows, totalCols: cols });
      await get().fetchPreviewAndProfile(dataset_id, name);
      set({ currentStep: 'profile', isLoading: false });
    } catch (err: any) {
      console.error('Failed to load dataset:', err);
      const errMsg = err?.response?.data?.detail || err.message || 'Failed to load dataset';
      set({ error: errMsg, isLoading: false });
    }
  },

  uploadFile: async (file: File, sheetName?: string) => {
    set({ isLoading: true, error: null });
    const formData = new FormData();
    formData.append('file', file);
    if (sheetName) formData.append('sheet_name', sheetName);

    try {
      const res = await axios.post('/api/datasets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { dataset_id, name, rows, cols } = res.data;
      set({ activeDatasetId: dataset_id, datasetName: name, totalRows: rows, totalCols: cols });
      await get().fetchPreviewAndProfile(dataset_id, name);
      set({ currentStep: 'profile', isLoading: false });
    } catch (err: any) {
      set({ error: err?.response?.data?.detail || err.message, isLoading: false });
    }
  },

  importFromSql: async (connectionString: string, query: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post('/api/datasets/sql', null, {
        params: { connection_string: connectionString, query }
      });
      const { dataset_id, name, rows, cols } = res.data;
      set({ activeDatasetId: dataset_id, datasetName: name, totalRows: rows, totalCols: cols });
      await get().fetchPreviewAndProfile(dataset_id, name);
      set({ currentStep: 'profile', isLoading: false });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'SQL connection failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  importFromKaggle: async (slug: string, username?: string, apiKey?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post('/api/datasets/kaggle', null, {
        params: { slug, username: username || undefined, api_key: apiKey || undefined }
      });
      const { dataset_id, name, rows, cols } = res.data;
      set({ activeDatasetId: dataset_id, datasetName: name, totalRows: rows, totalCols: cols });
      await get().fetchPreviewAndProfile(dataset_id, name);
      set({ currentStep: 'profile', isLoading: false });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Kaggle download failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchPreviewAndProfile: async (datasetId: string, name: string) => {
    try {
      const [prevRes, profRes, chartsRes, tempRes] = await Promise.all([
        axios.get(`/api/datasets/${datasetId}/preview`),
        axios.get(`/api/datasets/${datasetId}/profile`),
        axios.get(`/api/datasets/${datasetId}/suggest-charts`),
        axios.get(`/api/datasets/${datasetId}/templates`)
      ]);
      set({
        previewRows: prevRes.data.rows,
        previewCols: prevRes.data.columns,
        profile: profRes.data,
        activeCharts: chartsRes.data.charts,
        availableTemplates: tempRes.data
      });
    } catch (err: any) {
      set({ error: err?.response?.data?.detail || err.message });
    }
  },

  applyAutoClean: async () => {
    const { activeDatasetId, profile } = get();
    if (!activeDatasetId || !profile) return;

    set({ isLoading: true, error: null });
    const actions = profile.issues.map((i) => ({
      action_type: i.action_type,
      column: i.column,
      params: i.metadata || {},
      description: i.suggested_action
    }));

    try {
      const res = await axios.post(`/api/datasets/${activeDatasetId}/clean`, { actions });
      const newDatasetId = res.data.cleaned_dataset_id;
      set({
        previousProfile: profile,
        activeDatasetId: newDatasetId,
        cleaningHistory: res.data.applied_logs
      });
      await get().fetchPreviewAndProfile(newDatasetId, get().datasetName || 'Cleaned Dataset');
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.response?.data?.detail || err.message, isLoading: false });
    }
  },

  applySelectedCleanActions: async (actions: any[]) => {
    const { activeDatasetId, profile } = get();
    if (!activeDatasetId || actions.length === 0) return;

    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(`/api/datasets/${activeDatasetId}/clean`, { actions });
      const newDatasetId = res.data.cleaned_dataset_id;
      set({
        previousProfile: profile,
        activeDatasetId: newDatasetId,
        cleaningHistory: res.data.applied_logs
      });
      await get().fetchPreviewAndProfile(newDatasetId, get().datasetName || 'Cleaned Dataset');
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.response?.data?.detail || err.message, isLoading: false });
    }
  },

  applySingleCleanAction: async (action: any) => {
    const { activeDatasetId, profile } = get();
    if (!activeDatasetId) return;

    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(`/api/datasets/${activeDatasetId}/clean`, { actions: [action] });
      const newDatasetId = res.data.cleaned_dataset_id;
      
      // Update store with new dataset id & history from backend
      set({
        previousProfile: profile,
        activeDatasetId: newDatasetId,
        cleaningHistory: res.data.applied_logs
      });
      
      // Fetch fresh profile, preview and charts for the newly cleaned dataset
      await get().fetchPreviewAndProfile(newDatasetId, get().datasetName || 'Cleaned Dataset');
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.response?.data?.detail || err.message, isLoading: false });
    }
  },

  undoAction: async () => {
    const { activeDatasetId, profile } = get();
    if (!activeDatasetId) return;

    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(`/api/datasets/${activeDatasetId}/undo`);
      const restoredId = res.data.restored_dataset_id;
      set({
        previousProfile: profile,
        activeDatasetId: restoredId,
        cleaningHistory: res.data.history || []
      });
      await get().fetchPreviewAndProfile(restoredId, get().datasetName || 'Restored Dataset');
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err?.response?.data?.detail || err.message, isLoading: false });
    }
  },

  setCharts: (charts) => set({ activeCharts: charts }),
  addChart: (chart) => set((s) => ({ activeCharts: [...s.activeCharts, chart] })),
  removeChart: (chartId) => set((s) => ({ activeCharts: s.activeCharts.filter(c => c.id !== chartId) })),
  updateGlobalFilters: (filters) => set({ globalFilters: filters })
}));
