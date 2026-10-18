import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional

def suggest_charts_for_dataset(columns: List[Dict[str, Any]], dataset_name: str) -> List[Dict[str, Any]]:
    suggestions = []
    
    date_cols = [c["name"] for c in columns if c["inferred_type"] in ["date", "datetime"]]
    cat_cols = [c["name"] for c in columns if c["inferred_type"] in ["category", "boolean"] and c["unique_count"] <= 20]
    num_cols = [c["name"] for c in columns if c["inferred_type"] in ["integer", "float", "currency"] and c["inferred_type"] != "id_key"]
    
    # 1. Primary KPI Cards
    if num_cols:
        for idx, n in enumerate(num_cols[:3]):
            suggestions.append({
                "id": f"kpi_{n}",
                "title": f"Total {n}",
                "chart_type": "kpi",
                "measure": n,
                "aggregation": "sum",
                "w": 4,
                "h": 2,
                "x": (idx * 4) % 12,
                "y": 0
            })
            
    # 2. Time Series Line / Area Chart (Date + Numeric)
    if date_cols and num_cols:
        suggestions.append({
            "id": "trend_chart",
            "title": f"{num_cols[0]} Over Time ({date_cols[0]})",
            "chart_type": "line",
            "dimension": date_cols[0],
            "measure": num_cols[0],
            "aggregation": "sum",
            "w": 8,
            "h": 4,
            "x": 0,
            "y": 2
        })
        
    # 3. Category Breakdown Bar Chart (Category + Numeric)
    if cat_cols and num_cols:
        suggestions.append({
            "id": "cat_bar",
            "title": f"{num_cols[0]} by {cat_cols[0]}",
            "chart_type": "bar",
            "dimension": cat_cols[0],
            "measure": num_cols[0],
            "aggregation": "sum",
            "top_n": 10,
            "w": 4,
            "h": 4,
            "x": 8,
            "y": 2
        })
        
    # 4. Donut / Pie Share
    if len(cat_cols) > 1:
        suggestions.append({
            "id": "donut_share",
            "title": f"Distribution by {cat_cols[1]}",
            "chart_type": "donut",
            "dimension": cat_cols[1],
            "aggregation": "count",
            "w": 4,
            "h": 4,
            "x": 0,
            "y": 6
        })
    elif cat_cols:
        suggestions.append({
            "id": "donut_share",
            "title": f"Distribution by {cat_cols[0]}",
            "chart_type": "donut",
            "dimension": cat_cols[0],
            "aggregation": "count",
            "w": 4,
            "h": 4,
            "x": 0,
            "y": 6
        })

    # 5. Scatter Plot (Two Numerics)
    if len(num_cols) >= 2:
        suggestions.append({
            "id": "scatter_num",
            "title": f"{num_cols[0]} vs {num_cols[1]}",
            "chart_type": "scatter",
            "dimension": num_cols[0],
            "measure": num_cols[1],
            "w": 4,
            "h": 4,
            "x": 4,
            "y": 6
        })

    # 6. Numeric Distribution Histogram
    if num_cols:
        suggestions.append({
            "id": "hist_num",
            "title": f"{num_cols[0]} Distribution (Histogram)",
            "chart_type": "histogram",
            "measure": num_cols[0],
            "w": 4,
            "h": 4,
            "x": 8,
            "y": 6
        })

    return suggestions


def get_template_dashboard(template_name: str, columns: List[Dict[str, Any]], dataset_id: str) -> Dict[str, Any]:
    suggestions = suggest_charts_for_dataset(columns, template_name)
    return {
        "id": f"dash_{template_name.lower().replace(' ', '_')}",
        "dataset_id": dataset_id,
        "name": f"{template_name} Dashboard",
        "charts": suggestions
    }


def aggregate_chart_data(df: pd.DataFrame, config: Dict[str, Any], filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    df_filtered = df.copy()
    
    # Apply global filters
    if filters:
        # Date range
        date_ranges = filters.get("date_ranges", {})
        for d_col, r_vals in date_ranges.items():
            if d_col in df_filtered.columns and len(r_vals) == 2:
                start_val, end_val = r_vals[0], r_vals[1]
                if start_val:
                    df_filtered = df_filtered[df_filtered[d_col].astype(str) >= str(start_val)]
                if end_val:
                    df_filtered = df_filtered[df_filtered[d_col].astype(str) <= str(end_val)]

        # Category multi-select
        category_filters = filters.get("category_filters", {})
        for c_col, selected_opts in category_filters.items():
            if c_col in df_filtered.columns and selected_opts:
                df_filtered = df_filtered[df_filtered[c_col].astype(str).isin(selected_opts)]

        # Numeric range
        num_ranges = filters.get("numeric_ranges", {})
        for n_col, n_bounds in num_ranges.items():
            if n_col in df_filtered.columns and len(n_bounds) == 2:
                min_n, max_n = n_bounds[0], n_bounds[1]
                num_series = pd.to_numeric(df_filtered[n_col], errors='coerce')
                if min_n is not None:
                    df_filtered = df_filtered[num_series >= float(min_n)]
                if max_n is not None:
                    df_filtered = df_filtered[num_series <= float(max_n)]

    chart_type = config.get("chart_type", "bar")
    dim = config.get("dimension")
    measure = config.get("measure")
    agg = config.get("aggregation", "sum")
    top_n = config.get("top_n", 10)

    # 1. KPI Card
    if chart_type == "kpi":
        if measure and measure in df_filtered.columns:
            nums = pd.to_numeric(df_filtered[measure], errors='coerce').dropna()
            total = float(nums.sum()) if agg == "sum" else (float(nums.mean()) if agg == "avg" else len(nums))
            return {
                "chart_type": "kpi",
                "value": round(total, 2),
                "count": len(nums),
                "measure": measure,
                "aggregation": agg
            }
        return {"chart_type": "kpi", "value": len(df_filtered), "measure": "Rows", "aggregation": "count"}

    # 2. Histogram
    if chart_type == "histogram":
        if measure and measure in df_filtered.columns:
            nums = pd.to_numeric(df_filtered[measure], errors='coerce').dropna()
            if len(nums) > 0:
                counts, bin_edges = np.histogram(nums, bins=10)
                labels = [f"{round(bin_edges[i], 1)}-{round(bin_edges[i+1], 1)}" for i in range(len(counts))]
                return {
                    "chart_type": "histogram",
                    "categories": labels,
                    "series": [{"name": measure, "data": [int(c) for c in counts]}]
                }
        return {"chart_type": "histogram", "categories": [], "series": []}

    # 3. Scatter Plot
    if chart_type == "scatter":
        if dim and measure and dim in df_filtered.columns and measure in df_filtered.columns:
            sub = df_filtered[[dim, measure]].dropna().head(500)
            x_vals = pd.to_numeric(sub[dim], errors='coerce')
            y_vals = pd.to_numeric(sub[measure], errors='coerce')
            points = [[float(x), float(y)] for x, y in zip(x_vals, y_vals) if not (np.isnan(x) or np.isnan(y))]
            return {
                "chart_type": "scatter",
                "points": points,
                "x_label": dim,
                "y_label": measure
            }

    # 4. Dimension Aggregated Charts (Bar, Column, Line, Area, Pie, Donut)
    if dim and dim in df_filtered.columns:
        if measure and measure in df_filtered.columns and agg != "count":
            df_filtered["_num_val"] = pd.to_numeric(df_filtered[measure], errors='coerce')
            if agg == "sum":
                grouped = df_filtered.groupby(dim)["_num_val"].sum()
            elif agg == "avg":
                grouped = df_filtered.groupby(dim)["_num_val"].mean()
            elif agg == "min":
                grouped = df_filtered.groupby(dim)["_num_val"].min()
            elif agg == "max":
                grouped = df_filtered.groupby(dim)["_num_val"].max()
            else:
                grouped = df_filtered.groupby(dim)["_num_val"].nunique()
        else:
            grouped = df_filtered.groupby(dim).size()

        if top_n:
            grouped = grouped.sort_values(ascending=False).head(top_n)

        cats = [str(k) for k in grouped.index.tolist()]
        vals = [round(float(v), 2) for v in grouped.values.tolist()]

        if chart_type in ["pie", "donut"]:
            pie_data = [{"name": c, "value": v} for c, v in zip(cats, vals)]
            return {
                "chart_type": chart_type,
                "data": pie_data
            }

        return {
            "chart_type": chart_type,
            "categories": cats,
            "series": [{"name": measure or "Count", "data": vals}]
        }

    return {"chart_type": chart_type, "categories": [], "series": []}
