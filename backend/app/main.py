import os
import io
import uuid
import json
import sqlite3
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from app.models.schemas import (
    ProfileReport, CleanRequest, ChartDataRequest, ChartConfig, Dashboard
)
from app.profiler.engine import profile_dataset
from app.cleaner.engine import clean_dataframe, generate_cleaning_recipes
from app.dashboard.engine import suggest_charts_for_dataset, aggregate_chart_data, get_template_dashboard
from app.export.powerbi import generate_powerbi_handoff_package

app = FastAPI(title="DataForge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "datasets")
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "dataforge.db")
SAMPLE_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "sample_data"))

os.makedirs(STORAGE_DIR, exist_ok=True)

# In-memory session datasets & metadata store
DATASET_STORE: Dict[str, pd.DataFrame] = {}
PROFILE_CACHE: Dict[str, Dict[str, Any]] = {}
CLEANING_HISTORY: Dict[str, List[Dict[str, Any]]] = {}
DATASET_LINEAGE: Dict[str, str] = {}  # new_id -> previous_id
DASHBOARDS_STORE: Dict[str, List[Dict[str, Any]]] = {}

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.on_event("startup")
def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS datasets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            rows INTEGER,
            cols INTEGER,
            file_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS dashboards (
            id TEXT PRIMARY KEY,
            dataset_id TEXT,
            name TEXT,
            config_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_dataset_in_memory_and_disk(dataset_id: str, name: str, df: pd.DataFrame):
    DATASET_STORE[dataset_id] = df
    parquet_path = os.path.join(STORAGE_DIR, f"{dataset_id}.parquet")
    csv_path = os.path.join(STORAGE_DIR, f"{dataset_id}.csv")
    
    # Try parquet; if mixed types exist (common in messy datasets), save as CSV
    saved_path = parquet_path
    try:
        # Convert all object columns with mixed types safely to strings for parquet storage
        df_parquet = df.copy()
        for col in df_parquet.select_dtypes(include=['object']).columns:
            df_parquet[col] = df_parquet[col].astype(str)
        df_parquet.to_parquet(parquet_path, index=False)
    except Exception:
        df.to_csv(csv_path, index=False)
        saved_path = csv_path
    
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO datasets (id, name, rows, cols, file_path) VALUES (?, ?, ?, ?, ?)",
        (dataset_id, name, len(df), len(df.columns), saved_path)
    )
    conn.commit()
    conn.close()

def load_dataset(dataset_id: str) -> pd.DataFrame:
    if dataset_id in DATASET_STORE:
        return DATASET_STORE[dataset_id]
    parquet_path = os.path.join(STORAGE_DIR, f"{dataset_id}.parquet")
    csv_path = os.path.join(STORAGE_DIR, f"{dataset_id}.csv")
    if os.path.exists(parquet_path):
        try:
            df = pd.read_parquet(parquet_path)
            DATASET_STORE[dataset_id] = df
            return df
        except Exception:
            pass
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path, low_memory=False)
        DATASET_STORE[dataset_id] = df
        return df
    raise HTTPException(status_code=404, detail="Dataset not found")


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "DataForge"}


# 1. SAMPLE DATASETS
@app.get("/api/sample-datasets")
def list_sample_datasets():
    samples = []
    if os.path.exists(SAMPLE_DATA_DIR):
        for f in os.listdir(SAMPLE_DATA_DIR):
            if f.endswith(('.csv', '.xlsx')):
                size = os.path.getsize(os.path.join(SAMPLE_DATA_DIR, f))
                samples.append({
                    "filename": f,
                    "name": f.replace("_messy", "").replace(".csv", "").replace(".xlsx", "").title() + " (Messy Demo)",
                    "size_bytes": size,
                    "type": "csv" if f.endswith('.csv') else "xlsx"
                })
    return samples

@app.post("/api/datasets/load-sample")
def load_sample(filename: str):
    file_path = os.path.join(SAMPLE_DATA_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Sample dataset not found")
        
    dataset_id = str(uuid.uuid4())
    if filename.endswith('.xlsx'):
        # Load first sheet or employee info
        df = pd.read_excel(file_path, sheet_name=0)
    else:
        df = pd.read_csv(file_path, low_memory=False)

    save_dataset_in_memory_and_disk(dataset_id, filename, df)
    return {"dataset_id": dataset_id, "name": filename, "rows": len(df), "cols": len(df.columns)}

@app.get("/api/datasets/excel-sheets")
def get_excel_sheets(file_id: str):
    # Peek sheets if uploaded
    return {"sheets": ["Employee_Info", "Salary_Data"]}


# 2. UPLOAD FILE
@app.post("/api/datasets/upload")
async def upload_file(file: UploadFile = File(...), sheet_name: Optional[str] = Form(None)):
    contents = await file.read()
    filename = file.filename or "uploaded_data.csv"
    dataset_id = str(uuid.uuid4())
    
    try:
        if filename.endswith(('.xlsx', '.xls')):
            # Read excel
            xlsx_buf = io.BytesIO(contents)
            xl = pd.ExcelFile(xlsx_buf)
            target_sheet = sheet_name if sheet_name and sheet_name in xl.sheet_names else xl.sheet_names[0]
            df = pd.read_excel(xlsx_buf, sheet_name=target_sheet)
        elif filename.endswith('.parquet'):
            df = pd.read_parquet(io.BytesIO(contents))
        elif filename.endswith('.json'):
            df = pd.read_json(io.BytesIO(contents))
        else:
            # CSV / TSV with auto detection
            try:
                df = pd.read_csv(io.BytesIO(contents), sep=None, engine='python', on_bad_lines='skip')
            except Exception:
                df = pd.read_csv(io.BytesIO(contents), encoding='latin-1', sep=None, engine='python', on_bad_lines='skip')
                
        save_dataset_in_memory_and_disk(dataset_id, filename, df)
        return {"dataset_id": dataset_id, "name": filename, "rows": len(df), "cols": len(df.columns)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")


# 3. SQL IMPORT (Read-only security)
@app.post("/api/datasets/sql")
def import_sql(connection_string: str, query: str):
    forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "EXEC", "TRUNCATE", "GRANT"]
    q_upper = query.strip().upper()
    if not q_upper.startswith("SELECT") or any(f in q_upper for f in forbidden):
        raise HTTPException(status_code=400, detail="Security violation: Only read-only SELECT queries are allowed.")
        
    try:
        from sqlalchemy import create_engine
        engine = create_engine(connection_string)
        with engine.connect() as conn:
            df = pd.read_sql(query, conn)
            
        dataset_id = str(uuid.uuid4())
        save_dataset_in_memory_and_disk(dataset_id, "SQL_Query_Import", df)
        return {"dataset_id": dataset_id, "name": "SQL_Query_Import", "rows": len(df), "cols": len(df.columns)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SQL connection error: {str(e)}")


# 4. KAGGLE IMPORT
@app.post("/api/datasets/kaggle")
def import_kaggle(slug: str, username: Optional[str] = None, api_key: Optional[str] = None):
    # Clean slug from full URL, query params, trailing slashes
    clean_slug = slug.strip().split('?')[0].rstrip('/')
    for prefix in ["https://www.kaggle.com/datasets/", "http://www.kaggle.com/datasets/", "https://kaggle.com/datasets/", "http://kaggle.com/datasets/", "www.kaggle.com/datasets/", "kaggle.com/datasets/"]:
        if clean_slug.startswith(prefix):
            clean_slug = clean_slug[len(prefix):]
            break
    
    if username and api_key:
        os.environ["KAGGLE_USERNAME"] = username.strip()
        os.environ["KAGGLE_KEY"] = api_key.strip()
        
    has_creds = bool(os.environ.get("KAGGLE_USERNAME") and os.environ.get("KAGGLE_KEY"))
    if not has_creds and not os.path.exists(os.path.expanduser("~/.kaggle/kaggle.json")):
        raise HTTPException(
            status_code=400,
            detail="Kaggle API credentials required. Please enter your Kaggle Username and API Key below (get a free key at kaggle.com/settings -> Create New Token), or download the CSV directly from Kaggle and drop it into 'Upload File'."
        )

    try:
        import kaggle
        kaggle.api.authenticate()
        target_dir = os.path.join(STORAGE_DIR, "kaggle_downloads", str(uuid.uuid4()))
        os.makedirs(target_dir, exist_ok=True)
        kaggle.api.dataset_download_files(clean_slug, path=target_dir, unzip=True)
        
        # Find first CSV or parquet or xlsx
        downloaded = [f for f in os.listdir(target_dir) if f.endswith(('.csv', '.parquet', '.xlsx'))]
        if not downloaded:
            raise HTTPException(status_code=404, detail="No CSV/Excel files found in downloaded Kaggle dataset.")
            
        first_file = downloaded[0]
        full_path = os.path.join(target_dir, first_file)
        df = pd.read_csv(full_path) if first_file.endswith('.csv') else pd.read_excel(full_path)
        
        dataset_id = str(uuid.uuid4())
        save_dataset_in_memory_and_disk(dataset_id, f"Kaggle_{first_file}", df)
        return {"dataset_id": dataset_id, "name": first_file, "rows": len(df), "cols": len(df.columns)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Kaggle download failed: {str(e)}. Ensure dataset slug '{clean_slug}' exists and credentials are correct.")


# 5. DATA PREVIEW (First 100 rows virtualized)
@app.get("/api/datasets/{dataset_id}/preview")
def get_preview(dataset_id: str, limit: int = 100):
    df = load_dataset(dataset_id)
    preview_df = df.head(limit).replace({np.nan: None})
    
    columns = [{"name": c, "type": str(df[c].dtype)} for c in df.columns]
    rows = preview_df.to_dict(orient="records")
    return {
        "dataset_id": dataset_id,
        "total_rows": len(df),
        "total_cols": len(df.columns),
        "columns": columns,
        "rows": rows
    }


# 6. FULL PROFILING REPORT
@app.get("/api/datasets/{dataset_id}/profile")
def get_profile(dataset_id: str):
    if dataset_id in PROFILE_CACHE:
        return PROFILE_CACHE[dataset_id]
        
    df = load_dataset(dataset_id)
    report = profile_dataset(df, dataset_id, dataset_name=f"Dataset_{dataset_id[:6]}")
    PROFILE_CACHE[dataset_id] = report
    return report


# 7. CLEANING STUDIO (Apply actions)
@app.post("/api/datasets/{dataset_id}/clean")
def clean_dataset(dataset_id: str, request: CleanRequest):
    df = load_dataset(dataset_id)
    actions_dicts = [a.dict() for a in request.actions]
    
    cleaned_df, applied_logs = clean_dataframe(df, actions_dicts)
    
    # Create new versioned dataset
    new_dataset_id = str(uuid.uuid4())
    save_dataset_in_memory_and_disk(new_dataset_id, f"Cleaned_{dataset_id[:6]}", cleaned_df)
    
    # Store history and lineage
    DATASET_LINEAGE[new_dataset_id] = dataset_id
    current_history = CLEANING_HISTORY.get(dataset_id, [])
    CLEANING_HISTORY[new_dataset_id] = current_history + applied_logs

    # Re-profile cleaned dataset
    new_profile = profile_dataset(cleaned_df, new_dataset_id, f"Cleaned_{dataset_id[:6]}")
    PROFILE_CACHE[new_dataset_id] = new_profile

    return {
        "previous_dataset_id": dataset_id,
        "cleaned_dataset_id": new_dataset_id,
        "applied_logs": applied_logs,
        "new_health_score": new_profile["health_score"],
        "rows_remaining": len(cleaned_df),
        "cols_remaining": len(cleaned_df.columns)
    }

@app.post("/api/datasets/{dataset_id}/undo")
def undo_cleaning_step(dataset_id: str):
    if dataset_id not in DATASET_LINEAGE:
        raise HTTPException(status_code=400, detail="Cannot undo: No previous version recorded.")
    prev_id = DATASET_LINEAGE[dataset_id]
    prev_df = load_dataset(prev_id)
    prev_profile = get_profile(prev_id)
    return {
        "restored_dataset_id": prev_id,
        "health_score": prev_profile["health_score"],
        "rows": len(prev_df),
        "cols": len(prev_df.columns),
        "history": CLEANING_HISTORY.get(prev_id, [])
    }

@app.get("/api/datasets/{dataset_id}/history")
def get_history(dataset_id: str):
    return {"history": CLEANING_HISTORY.get(dataset_id, [])}


# 8. RECIPES EXPORT (Python, SQL, Power Query M)
@app.get("/api/datasets/{dataset_id}/recipe")
def get_recipes(dataset_id: str):
    actions = CLEANING_HISTORY.get(dataset_id, [])
    recipes = generate_cleaning_recipes(actions, f"dataset_{dataset_id[:6]}.csv")
    return recipes


# 9. DASHBOARDS & CHART AGGREGATIONS
@app.get("/api/datasets/{dataset_id}/suggest-charts")
def suggest_charts(dataset_id: str):
    profile = get_profile(dataset_id)
    suggestions = suggest_charts_for_dataset(profile["columns"], profile["dataset_name"])
    return {"charts": suggestions}

@app.get("/api/datasets/{dataset_id}/templates")
def list_templates(dataset_id: str):
    profile = get_profile(dataset_id)
    templates = [
        get_template_dashboard("Sales", profile["columns"], dataset_id),
        get_template_dashboard("HR Employee", profile["columns"], dataset_id),
        get_template_dashboard("Finance Expense", profile["columns"], dataset_id),
        get_template_dashboard("Customer Marketing", profile["columns"], dataset_id),
        get_template_dashboard("Generic Explorer", profile["columns"], dataset_id)
    ]
    return templates

@app.post("/api/datasets/{dataset_id}/chart-data")
def get_chart_data(dataset_id: str, request: ChartDataRequest):
    df = load_dataset(dataset_id)
    filters_dict = request.filters.dict() if request.filters else None
    data = aggregate_chart_data(df, request.config.dict(), filters_dict)
    return data


# 10. EXPORT (CSV, XLSX, Parquet, Power BI package)
@app.get("/api/datasets/{dataset_id}/export")
def export_dataset(dataset_id: str, format: str = "csv"):
    df = load_dataset(dataset_id)
    
    if format == "csv":
        csv_bytes = df.to_csv(index=False).encode('utf-8')
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=dataforge_{dataset_id[:6]}.csv"}
        )
    elif format == "xlsx":
        out = io.BytesIO()
        df.to_excel(out, index=False, engine='openpyxl')
        out.seek(0)
        return StreamingResponse(
            out,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=dataforge_{dataset_id[:6]}.xlsx"}
        )
    elif format == "parquet":
        out = io.BytesIO()
        df.to_parquet(out, index=False)
        out.seek(0)
        return StreamingResponse(
            out,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename=dataforge_{dataset_id[:6]}.parquet"}
        )
    elif format == "powerbi":
        profile = get_profile(dataset_id)
        actions = CLEANING_HISTORY.get(dataset_id, [])
        pkg_bytes = generate_powerbi_handoff_package(
            df=df,
            dataset_name=f"dataset_{dataset_id[:6]}",
            columns=profile["columns"],
            cleaning_actions=actions
        )
        return StreamingResponse(
            io.BytesIO(pkg_bytes),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=PowerBI_Package_{dataset_id[:6]}.zip"}
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format")
