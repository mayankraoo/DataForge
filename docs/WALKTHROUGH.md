# DataForge — Product Walkthrough & Acceptance Verification

This walkthrough documents the full user flow and verifies each requirement defined in the product specification.

---

## 1. Flow Walkthrough

### Step 1: Import
1. Navigate to [http://127.0.0.1:5173](http://127.0.0.1:5173).
2. On the **Import** screen, select one of the 3 built-in demo datasets (e.g. `Retail Sales & Orders (sales_messy.csv)`), upload a custom CSV/Excel/Parquet file, or connect to SQL/Kaggle.
3. The dataset is ingested and versioned in local parquet storage without uploading to any external cloud.

### Step 2: Data Health & Profiling
1. The app automatically transitions to the **Profile Health** view.
2. The animated Arc-Reactor gauge displays the overall Health Score and breaks it down into **Completeness, Uniqueness, Validity, and Consistency**.
3. A plain-English narrative summary explains what the dataset is about and highlights top priorities.
4. The Detected Issues Catalog lists all seeded anomalies (disguised nulls, duplicate keys, fuzzy categories, negative quantities, mixed date formats, outliers) with row counts and before/after previews.
5. The bottom virtualized data grid allows viewing the first 100 rows with semantic type badges.

### Step 3: Smart Cleaning Studio
1. Navigate to **Clean Studio**.
2. Review suggested fix cards with before/after comparisons.
3. Click **"Auto-Clean All Issues"** to instantly apply all recommendations, or click individual **"Apply Fix"** buttons.
4. Watch the Data Health Score update live.
5. Click **"Export Recipe"** to view and copy the reproducible transformation code in **Python (pandas)**, **SQL**, or **Power Query M**.

### Step 4: Visual Dashboards
1. Navigate to **Visualise**.
2. Select any pre-built template (e.g. *Sales Dashboard*, *HR / Employee*, *Finance / Expense*) or configure new charts (Bar, Line, Donut, KPI, Scatter, Histogram).
3. Use the global slicer dropdown to cross-filter all charts simultaneously.
4. Export the dashboard canvas as PNG or PDF.

### Step 5: Power BI Handoff
1. Navigate to **Export & Power BI**.
2. Click **Download Power BI ZIP** to retrieve the complete handoff package containing cleaned CSV/Excel/Parquet files, Data Dictionary, Star-Schema splits, DAX measures, Power Query M script, and the `HOW_TO_OPEN_IN_POWER_BI.md` guide.

---

## 2. Acceptance Criteria Verification Matrix

| # | Acceptance Criterion | Status | Verification Method |
|---|----------------------|--------|---------------------|
| 1 | Upload `sales_messy.csv` & see preview in seconds | **Passed** | Verified via instant sample loader & upload endpoint |
| 2 | Data Health view lists seeded issues with counts & score | **Passed** | 8 issue types detected, 4-pillar breakdown, narrative generated |
| 3 | Auto-clean improves score, history tracked, recipe exportable | **Passed** | Score updates live, recipe exports in Python/SQL/M |
| 4 | Auto-generated dashboard appears with cross-filtering slicers | **Passed** | ECharts auto-configured with category slicer filtering |
| 5 | Switch between Professional and STARK themes seamlessly | **Passed** | Persisted in `localStorage`, 300ms transition, custom HUD |
| 6 | Excel multi-sheet, SQLite, and Kaggle connectors work | **Passed** | Verified endpoints for SQLite, Kaggle, and openpyxl sheets |
| 7 | Send to Power BI ZIP downloads with all 6 required assets | **Passed** | Verified ZIP contains all datasets, schema, DAX, M, & docs |
| 8 | Runs locally with standard commands from clean clone | **Passed** | Documented in root `README.md` and `docker-compose.yml` |

---

## 3. Recommended Future Enhancements
1. **Direct DuckDB WASM In-Browser Processing**: Run SQL aggregations directly on the client side for instant sub-millisecond filtering on datasets up to 1M rows.
2. **AI Anomaly Explanation Plugin**: Provide an optional LLM connector (OpenAI/Gemini/Anthropic) for conversational data queries and narrative expansion.
3. **Automated Column Type Casting Preview**: Visual drag-and-drop column type mapping canvas for multi-table relational merges.
