# DataForge — Intelligent Data Ingestion, Profiling, Cleaning & Dashboards

DataForge takes messy, unorganised data from CSV, Excel, SQL, and Kaggle, automatically infers semantic structures, profiles health, diagnoses hidden flaws, cleans data with human approval, and generates interactive dashboards and Power BI handoff packages in under 2 minutes.

---

## ⚡ Quick Start (Local Setup)

### Prerequisites
- **Python 3.12+** (or `uv`)
- **Node.js 20+** and `npm`

### 1. Start Backend (FastAPI)
```bash
cd backend
# Create virtual environment and install packages
uv venv --python 3.12 .venv
.venv\Scripts\activate   # On Windows (or source .venv/bin/activate on macOS/Linux)
uv pip install -r requirements.txt

# Start API server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Start Frontend (React + Vite + Tailwind + ECharts)
```bash
cd frontend
npm install
npm run dev
```
Open your browser at: [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## 🚀 Key Features

1. **Multi-Source Ingestion**
   - File upload: CSV (with auto delimiter & encoding detection), TSV, Excel (multi-sheet support), Parquet, JSON.
   - SQL connector: Read-only SELECT query validation with in-memory credential safety.
   - Kaggle connector: Pull any dataset by slug or URL.
   - 3 Instant Messy Demo Datasets (`sales_messy.csv`, `employees_messy.xlsx`, `customers_messy.csv`).

2. **Automatic Profiling Engine**
   - Semantic type inference (currency, percentage, dates, categories, emails, phones, IDs).
   - Detection of disguised nulls (`"N/A"`, `"-"`, `"unknown"`, etc.), duplicate records, statistical outliers (IQR), impossible negative values, whitespace, and fuzzy category duplicates (RapidFuzz).
   - Animated Health Score Gauge (0-100) with 4-pillar breakdown (Completeness, Uniqueness, Validity, Consistency).
   - Deterministic rule-based plain English narrative summary.

3. **Smart Cleaning Studio**
   - Human-in-the-loop review cards with before/after previews for affected rows.
   - 1-click **"Auto-Clean All Recommended Fixes"** or granular per-issue actions.
   - Cleaning history timeline with non-destructive versioning.
   - Recipe export in **Python (pandas)**, **SQL**, and **Power Query M**.

4. **Interactive Dashboard Canvas**
   - Automated chart generation based on data types.
   - 5 pre-built industry templates: Sales, HR / Employee, Finance / Expense, Customer / Marketing, and Generic Explorer.
   - Cross-filtering global slicers and custom chart builder.
   - PNG and PDF dashboard exports.

5. **Power BI Handoff Package**
   - 1-click bundled ZIP containing:
     - Cleaned CSV, Excel (.xlsx), and Apache Parquet files.
     - Markdown & CSV Data Dictionaries.
     - Auto-detected Star Schema dimension tables (`Dim_Customers.csv`, `Dim_Products.csv`, `Dim_Date.csv`).
     - Starter DAX measures (`DAX_Measures.dax`).
     - Power Query M transformation script (`Transformations.m`).
     - `HOW_TO_OPEN_IN_POWER_BI.md` guide.

6. **Dual Theme Engine**
   - **Professional (Light)**: Clean slate/indigo aesthetic inspired by Linear and Stripe.
   - **STARK (Dark HUD)**: Tony Stark / JARVIS inspired futuristic theme with arc-reactor cyan (`#00E5FF`), gold highlights, glassmorphism, HUD corner brackets, animated scanlines, and optional Web Audio SFX synthesizer. Persisted in `localStorage`.
