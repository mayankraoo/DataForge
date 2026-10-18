from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class ColumnProfile(BaseModel):
    name: str
    inferred_type: str  # integer, float, currency, percentage, date, datetime, boolean, category, free_text, email, phone, url, id_key, constant
    missing_count: int
    missing_pct: float
    unique_count: int
    cardinality_ratio: float
    min_val: Optional[Any] = None
    max_val: Optional[Any] = None
    mean_val: Optional[float] = None
    median_val: Optional[float] = None
    std_val: Optional[float] = None
    skewness: Optional[float] = None
    top_values: List[Dict[str, Any]] = []  # [{"value": "Delhi", "count": 140, "pct": 7.0}]
    sample_values: List[Any] = []
    sparkline: List[float] = []

class DataIssue(BaseModel):
    id: str
    column: Optional[str] = None
    issue_type: str  # missing_values, duplicate_rows, duplicate_keys, mixed_types, inconsistent_categories, whitespace, inconsistent_dates, outliers, constant_columns, high_cardinality, unit_inconsistencies, class_imbalance, correlated_columns
    severity: str    # Critical, Warning, Info
    description: str
    affected_rows_count: int
    affected_rows_pct: float
    suggested_action: str
    action_type: str  # drop_nulls, fill_mean, fill_median, fill_mode, fill_constant, drop_duplicates, merge_categories, trim_whitespace, parse_dates, cap_outliers, remove_outliers, drop_column, normalize_units
    options: List[Dict[str, Any]] = []
    before_after_sample: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = {}

class HealthScoreBreakdown(BaseModel):
    overall: int       # 0 - 100
    completeness: int  # 0 - 100
    uniqueness: int    # 0 - 100
    validity: int      # 0 - 100
    consistency: int   # 0 - 100

class ProfileReport(BaseModel):
    dataset_id: str
    dataset_name: str
    total_rows: int
    total_columns: int
    file_size_bytes: int
    is_sampled: bool
    sample_rows: Optional[int] = None
    health_score: HealthScoreBreakdown
    narrative_summary: str
    top_problems: List[str]
    columns: List[ColumnProfile]
    issues: List[DataIssue]
    created_at: str

class CleaningAction(BaseModel):
    action_type: str
    column: Optional[str] = None
    params: Dict[str, Any] = {}
    description: Optional[str] = ""

class CleanRequest(BaseModel):
    actions: List[CleaningAction]

class ChartConfig(BaseModel):
    id: str
    title: str
    chart_type: str # kpi, bar, column, stacked, line, area, pie, donut, scatter, histogram, boxplot, heatmap, table, funnel, gauge
    dimension: Optional[str] = None
    dimension2: Optional[str] = None
    measure: Optional[str] = None
    aggregation: Optional[str] = "sum" # sum, avg, count, distinct_count, min, max
    sort_by: Optional[str] = "desc"
    top_n: Optional[int] = 10
    color: Optional[str] = None
    w: int = 6
    h: int = 4
    x: int = 0
    y: int = 0

class GlobalFilters(BaseModel):
    date_ranges: Dict[str, List[Optional[str]]] = {}
    category_filters: Dict[str, List[str]] = {}
    numeric_ranges: Dict[str, List[Optional[float]]] = {}
    search_query: Optional[str] = None

class ChartDataRequest(BaseModel):
    config: ChartConfig
    filters: Optional[GlobalFilters] = None

class Dashboard(BaseModel):
    id: str
    dataset_id: str
    name: str
    description: Optional[str] = ""
    charts: List[ChartConfig] = []
    created_at: str
    updated_at: str
