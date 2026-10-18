# Assumptions & Design Decisions

This document tracks assumptions made across the DataForge platform implementation in accordance with specification section 13.

### 1. Dataset Storage & Session Isolation
- Datasets are stored in a local directory `backend/storage/datasets/<dataset_id>/` with versioned snapshots: `v0_raw.parquet`, `v1.parquet`, etc.
- SQLite database `backend/storage/dataforge.db` stores metadata, project settings, profiling cache, cleaning recipe history, and dashboard configurations.
- Cleaning history stores reversible step definitions so any step can be applied or undone.

### 2. Disguised Nulls & Data Types
- Disguised null representations detected include: `["", "na", "n/a", "null", "none", "-", "?", "unknown", "nan", "nil", "missing", "undefined", "#n/a"]`.
- Numeric columns with values <= 0 for fields named with keywords `age`, `quantity`, `price`, `salary`, `amount` are flagged as implausible or impossible values.

### 3. Sampling for Profiling
- Datasets exceeding 500,000 rows will be profiled on a deterministic stratified/uniform sample of 100,000 rows to ensure sub-2-second profiling, with an explicit UI notification and badge.

### 4. SQL Import Security
- Only `SELECT` statements are accepted. Statements containing mutations (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `CREATE`, `EXEC`, `TRUNCATE`, `GRANT`) are rejected by the query validator.
- Database credentials and passwords are kept in-memory for the duration of the query/session and never written to the SQLite database or disk.

### 5. Kaggle Integration
- When Kaggle API keys (`KAGGLE_USERNAME`, `KAGGLE_KEY`) are provided in Settings, the official `kaggle` package is used to download datasets. If keys are not present, users are given a helpful guidance modal to input them or paste a URL/upload directly.

### 6. Theme Switching
- Theme selection (`professional` | `stark`) is persisted in `localStorage` under key `dataforge_theme`.
- CSS tokens define background, card surfaces, borders, font families, and accent colors. STARK theme adds canvas HUD grid, corner clip brackets, glow effects, and optional sound synthesizer for UI clicks.
