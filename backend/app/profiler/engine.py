import os
import json
import re
import math
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
from rapidfuzz import process, fuzz
from datetime import datetime

DISGUISED_NULL_STRINGS = {
    "", "na", "n/a", "null", "none", "-", "--", "?", "unknown", "nan", "nil", "missing", "undefined", "#n/a", "none"
}

EMAIL_REGEX = re.compile(r"^[\w\.-]+@([\w-]+\.)+[\w-]{2,4}$")
PHONE_REGEX = re.compile(r"^(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$")
URL_REGEX = re.compile(r"^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$")
CURRENCY_REGEX = re.compile(r"^[\$€£₹¥]\s*[\d,]+(\.\d+)?$|^\s*[\d,]+(\.\d+)?\s*[\$€£₹¥]$")
PERCENT_REGEX = re.compile(r"^\s*[\d\.]+\s*%$")
K_NUMBER_REGEX = re.compile(r"^\s*(\d+(\.\d+)?)\s*[kK]\s*$")

def is_disguised_null(val: Any) -> bool:
    if pd.isna(val):
        return True
    s = str(val).strip().lower()
    return s in DISGUISED_NULL_STRINGS

def clean_disguised_series(series: pd.Series) -> pd.Series:
    return series.apply(lambda x: np.nan if is_disguised_null(x) else x)

def infer_column_semantic_type(series: pd.Series, col_name: str) -> str:
    cleaned = clean_disguised_series(series).dropna()
    total = len(cleaned)
    if total == 0:
        return "empty"
    
    unique_cnt = cleaned.nunique()
    if unique_cnt == 1:
        return "constant"
    
    # Check boolean
    bool_vals = {"true", "false", "1", "0", "yes", "no", "t", "f", "y", "n"}
    if cleaned.astype(str).str.lower().isin(bool_vals).all() and unique_cnt <= 2:
        return "boolean"
        
    sample = cleaned.astype(str).str.strip().tolist()[:100]
    
    # Check currency
    currency_matches = sum(1 for s in sample if CURRENCY_REGEX.match(s) or K_NUMBER_REGEX.match(s))
    if currency_matches / len(sample) > 0.6:
        return "currency"
        
    # Check percentage
    percent_matches = sum(1 for s in sample if PERCENT_REGEX.match(s))
    if percent_matches / len(sample) > 0.6:
        return "percentage"
        
    # Check email
    email_matches = sum(1 for s in sample if EMAIL_REGEX.match(s))
    if email_matches / len(sample) > 0.5:
        return "email"
        
    # Check phone
    phone_matches = sum(1 for s in sample if PHONE_REGEX.match(s))
    if phone_matches / len(sample) > 0.5:
        return "phone"
        
    # Check URL
    url_matches = sum(1 for s in sample if URL_REGEX.match(s))
    if url_matches / len(sample) > 0.5:
        return "url"
        
    # Check numeric
    try:
        # Check if already numeric or parsable
        if pd.api.types.is_numeric_dtype(cleaned):
            if pd.api.types.is_integer_dtype(cleaned) or (cleaned % 1 == 0).all():
                # Check if looks like an ID
                lower_name = col_name.lower()
                if ("id" in lower_name or "key" in lower_name or "code" in lower_name) and (unique_cnt / total > 0.7):
                    return "id_key"
                return "integer"
            return "float"
        else:
            # Try parsing numeric from string
            cleaned_num = pd.to_numeric(cleaned.astype(str).str.replace(r"[^\d.-]", "", regex=True), errors='coerce')
            if cleaned_num.notna().sum() / total > 0.75:
                return "float"
    except Exception:
        pass
        
    # Check datetime / date
    date_success = 0
    for s in sample[:25]:
        if len(s) >= 6:
            try:
                pd.to_datetime(s, format='mixed', errors='raise')
                date_success += 1
            except Exception:
                pass
    if len(sample[:25]) > 0 and (date_success / len(sample[:25])) > 0.6:
        return "date"
        
    # Check ID / Key
    lower_name = col_name.lower()
    if ("id" in lower_name or "code" in lower_name or "key" in lower_name or "sku" in lower_name) and (unique_cnt / total > 0.7):
        return "id_key"
        
    # Check categorical vs free text
    if unique_cnt <= 60 or (unique_cnt / total < 0.25):
        return "category"
        
    return "free_text"


def profile_dataset(df: pd.DataFrame, dataset_id: str, dataset_name: str, file_size_bytes: int = 0) -> Dict[str, Any]:
    total_rows = len(df)
    total_cols = len(df.columns)
    is_sampled = False
    sample_rows = None

    if total_rows > 500000:
        is_sampled = True
        sample_rows = 100000
        df_profile = df.sample(n=100000, random_state=42)
    else:
        df_profile = df

    column_profiles = []
    issues = []
    
    completeness_scores = []
    validity_scores = []
    consistency_scores = []
    uniqueness_scores = []

    # 1. Duplicate Rows Check
    dup_rows_count = int(df_profile.duplicated().sum())
    dup_rows_pct = round((dup_rows_count / len(df_profile)) * 100, 2)
    if dup_rows_count > 0:
        dup_mask = df_profile.duplicated(keep=False)
        sample_row_nums = [int(i) + 1 for i in df_profile.index[dup_mask][:4]]
        issues.append({
            "id": "dup_rows",
            "column": None,
            "issue_type": "duplicate_rows",
            "severity": "Critical" if dup_rows_pct > 2 else "Warning",
            "description": f"Found {dup_rows_count} exact duplicate rows ({dup_rows_pct}% of dataset).",
            "affected_rows_count": dup_rows_count,
            "affected_rows_pct": dup_rows_pct,
            "sample_rows": sample_row_nums,
            "suggested_action": "Drop duplicate rows keeping first occurrence",
            "action_type": "drop_duplicates",
            "options": [
                {"label": "Keep First", "value": "first"},
                {"label": "Keep Last", "value": "last"},
                {"label": "Drop All Duplicates", "value": "none"}
            ],
            "before_after_sample": [
                {"before": "Row duplicates present", "after": "Retain unique single rows"}
            ],
            "metadata": {}
        })
        uniqueness_scores.append(max(0, 100 - int(dup_rows_pct * 3)))
    else:
        uniqueness_scores.append(100)

    # Profiling per column
    for col in df_profile.columns:
        series = df_profile[col]
        col_type = infer_column_semantic_type(series, col)
        
        # Missing & Disguised Nulls
        is_null_mask = series.apply(is_disguised_null)
        missing_count = int(is_null_mask.sum())
        missing_pct = round((missing_count / len(df_profile)) * 100, 2)
        valid_series = series[~is_null_mask]
        unique_cnt = int(valid_series.nunique())
        cardinality_ratio = round(unique_cnt / max(1, len(valid_series)), 4)
        
        comp_score = max(0, 100 - int(missing_pct * 1.5))
        completeness_scores.append(comp_score)
        
        # Stats initialization
        min_v, max_v, mean_v, median_v, std_v, skew_v = None, None, None, None, None, None
        sparkline = []
        
        # Numeric Stats
        num_series = pd.to_numeric(
            valid_series.astype(str).str.replace(r"[^\d.-]", "", regex=True), 
            errors='coerce'
        ).dropna()
        
        if len(num_series) > 0 and col_type in ["integer", "float", "currency", "percentage"]:
            try:
                min_v = float(num_series.min())
                max_v = float(num_series.max())
                mean_v = round(float(num_series.mean()), 2)
                median_v = round(float(num_series.median()), 2)
                std_v = round(float(num_series.std()), 2) if len(num_series) > 1 else 0.0
                if len(num_series) > 2 and std_v > 0:
                    skew_calc = float(num_series.skew())
                    skew_v = round(skew_calc, 2) if not np.isnan(skew_calc) else 0.0
                
                # Sparkline histogram (10 bins)
                hist_counts, _ = np.histogram(num_series, bins=10)
                sparkline = [float(c) for c in hist_counts]
            except Exception:
                pass
        
        # Top 5 values
        top_val_counts = valid_series.astype(str).value_counts().head(5)
        top_values = [
            {"value": str(idx), "count": int(count), "pct": round((count / max(1, len(valid_series))) * 100, 1)}
            for idx, count in top_val_counts.items()
        ]
        sample_values = [str(x) for x in valid_series.head(5).tolist()]
        
        column_profiles.append({
            "name": col,
            "inferred_type": col_type,
            "missing_count": missing_count,
            "missing_pct": missing_pct,
            "unique_count": unique_cnt,
            "cardinality_ratio": cardinality_ratio,
            "min_val": min_v,
            "max_val": max_v,
            "mean_val": mean_v,
            "median_val": median_v,
            "std_val": std_v,
            "skewness": skew_v,
            "top_values": top_values,
            "sample_values": sample_values,
            "sparkline": sparkline
        })
        
        # ISSUE 1: Missing Values
        if missing_count > 0:
            severity = "Critical" if missing_pct > 25 else ("Warning" if missing_pct > 5 else "Info")
            options = [
                {"label": "Drop Rows with Missing Values", "value": "drop"},
                {"label": "Leave As Is", "value": "keep"}
            ]
            if col_type in ["integer", "float", "currency"]:
                options.insert(1, {"label": "Fill with Median", "value": "median"})
                options.insert(2, {"label": "Fill with Mean", "value": "mean"})
                options.insert(3, {"label": "Fill with 0", "value": "zero"})
            elif col_type in ["category", "free_text"]:
                options.insert(1, {"label": "Fill with Mode (Most Frequent)", "value": "mode"})
                options.insert(2, {"label": 'Fill with "Unknown"', "value": "unknown"})
                
            sample_row_nums = [int(i) + 1 for i in df_profile.index[is_null_mask][:4]]
            issues.append({
                "id": f"missing_{col}",
                "column": col,
                "issue_type": "missing_values",
                "severity": severity,
                "description": f"Column '{col}' has {missing_count} missing/disguised null values ({missing_pct}%).",
                "affected_rows_count": missing_count,
                "affected_rows_pct": missing_pct,
                "sample_rows": sample_row_nums,
                "suggested_action": "Fill missing values with median" if col_type in ["integer", "float", "currency"] else "Fill with mode/Unknown",
                "action_type": "fill_median" if col_type in ["integer", "float", "currency"] else "fill_mode",
                "options": options,
                "before_after_sample": [
                    {"before": "N/A or null", "after": f"{median_v}" if median_v is not None else "Most Frequent"}
                ],
                "metadata": {"col_type": col_type}
            })
            
        # ISSUE 2: Constant / Near-Constant Columns
        if unique_cnt == 1:
            issues.append({
                "id": f"const_{col}",
                "column": col,
                "issue_type": "constant_columns",
                "severity": "Warning",
                "description": f"Column '{col}' is constant (contains only 1 unique value: '{sample_values[0] if sample_values else ''}').",
                "affected_rows_count": len(df_profile),
                "affected_rows_pct": 100.0,
                "suggested_action": f"Drop uninformative constant column '{col}'",
                "action_type": "drop_column",
                "options": [{"label": "Drop Column", "value": "drop"}, {"label": "Keep Column", "value": "keep"}],
                "before_after_sample": [{"before": f"Column '{col}' present", "after": "Column removed"}],
                "metadata": {}
            })
            consistency_scores.append(80)
        elif len(valid_series) > 0 and (unique_cnt == 2) and (top_values and top_values[0]["pct"] > 95):
            issues.append({
                "id": f"near_const_{col}",
                "column": col,
                "issue_type": "constant_columns",
                "severity": "Info",
                "description": f"Column '{col}' is near-constant ({top_values[0]['pct']}% is '{top_values[0]['value']}').",
                "affected_rows_count": int(len(valid_series) * (top_values[0]['pct']/100)),
                "affected_rows_pct": top_values[0]["pct"],
                "suggested_action": f"Drop uninformative near-constant column '{col}'",
                "action_type": "drop_column",
                "options": [{"label": "Drop Column", "value": "drop"}, {"label": "Keep Column", "value": "keep"}],
                "before_after_sample": [{"before": f"Column '{col}' present", "after": "Column removed"}],
                "metadata": {}
            })
            
        # ISSUE 3: Whitespace & Casing Inconsistencies in Text/Categories
        if col_type in ["category", "free_text"]:
            str_series = valid_series.astype(str)
            ws_mask = str_series != str_series.str.strip()
            whitespace_count = int(ws_mask.sum())
            if whitespace_count > 0:
                ws_pct = round((whitespace_count / len(df_profile)) * 100, 2)
                ws_indices = [int(i) + 1 for i in df_profile.index[valid_series.index[ws_mask]][:4]]
                issues.append({
                    "id": f"ws_{col}",
                    "column": col,
                    "issue_type": "whitespace",
                    "severity": "Warning",
                    "description": f"Found {whitespace_count} entries ({ws_pct}%) with leading/trailing whitespace in '{col}'.",
                    "affected_rows_count": whitespace_count,
                    "affected_rows_pct": ws_pct,
                    "sample_rows": ws_indices,
                    "suggested_action": f"Trim leading/trailing whitespace in '{col}'",
                    "action_type": "trim_whitespace",
                    "options": [{"label": "Trim Whitespace", "value": "trim"}, {"label": "Trim & Titlecase", "value": "trim_title"}],
                    "before_after_sample": [
                        {"before": f'"{str_series[str_series != str_series.str.strip()].iloc[0]}"', "after": f'"{str_series[str_series != str_series.str.strip()].iloc[0].strip()}"'}
                    ],
                    "metadata": {}
                })
                consistency_scores.append(max(0, 100 - int(ws_pct * 2)))

        # ISSUE 4: Inconsistent Categories (Fuzzy matching with RapidFuzz)
        if col_type == "category" and unique_cnt > 1 and unique_cnt < 80:
            str_series = valid_series.astype(str).str.strip()
            unique_cats = list(str_series.unique())
            merge_groups = []
            seen = set()
            
            for cat in unique_cats:
                if cat in seen or len(cat) < 3:
                    continue
                matches = process.extract(cat, unique_cats, scorer=fuzz.token_sort_ratio, score_cutoff=80, limit=6)
                cluster = [m[0] for m in matches if m[0] != cat and m[1] >= 80]
                if cluster:
                    all_variants = [cat] + cluster
                    # Pick canonical (most frequent or cleanest titlecase)
                    counts = str_series[str_series.isin(all_variants)].value_counts()
                    canonical = counts.index[0]
                    merge_groups.append({
                        "canonical": canonical,
                        "variants": [v for v in all_variants if v != canonical]
                    })
                    for v in all_variants:
                        seen.add(v)
            
            if merge_groups:
                total_affected = sum(int(str_series.isin(g["variants"]).sum()) for g in merge_groups)
                aff_pct = round((total_affected / len(df_profile)) * 100, 2)
                issues.append({
                    "id": f"cat_fuzz_{col}",
                    "column": col,
                    "issue_type": "inconsistent_categories",
                    "severity": "Warning",
                    "description": f"Found inconsistent spelling/casing variations in '{col}' (e.g., {merge_groups[0]['canonical']} vs {', '.join(merge_groups[0]['variants'][:2])}).",
                    "affected_rows_count": total_affected,
                    "affected_rows_pct": aff_pct,
                    "suggested_action": f"Merge {len(merge_groups)} category clusters into canonical names",
                    "action_type": "merge_categories",
                    "options": [
                        {"label": "Accept Proposed Merge Groups", "value": "merge_auto"},
                        {"label": "Title Case All", "value": "titlecase"}
                    ],
                    "before_after_sample": [
                        {"before": f"{g['variants'][0]}", "after": f"{g['canonical']}"} for g in merge_groups[:3]
                    ],
                    "metadata": {"merge_groups": merge_groups}
                })
                consistency_scores.append(max(0, 100 - int(aff_pct * 3)))

        # ISSUE 5: Outliers & Impossible Values (IQR + Z-score)
        if len(num_series) > 0 and col_type in ["integer", "float", "currency"]:
            lower_name = col.lower()
            tokens = set(re.findall(r"\w+", lower_name))
            impossible_mask = pd.Series(False, index=num_series.index)
            
            # Exact word match for Age: matches 'age', 'employee_age', but NEVER 'average', 'package', 'percentage'
            is_age_col = bool(re.search(r"\b(age|user_age|customer_age|employee_age)\b", lower_name)) and not any(w in lower_name for w in ["cost", "price", "rate", "percentage", "average", "avg", "salary", "amount"])
            
            # Non-negative columns (prices, quantities, costs, salaries, amounts)
            is_non_negative_col = bool(tokens.intersection({"quantity", "qty", "price", "unitprice", "cost", "salary", "amount", "revenue", "sales"})) or is_age_col
            
            if is_non_negative_col:
                if is_age_col:
                    impossible_mask = (num_series < 0) | (num_series > 125)
                else:
                    impossible_mask = num_series < 0
            
            impossible_count = int(impossible_mask.sum())
            if impossible_count > 0:
                imp_pct = round((impossible_count / len(df_profile)) * 100, 2)
                imp_indices = [int(i) + 1 for i in df_profile.index[num_series.index[impossible_mask]][:4]]
                sample_val = num_series[impossible_mask].iloc[0]
                issues.append({
                    "id": f"impossible_{col}",
                    "column": col,
                    "issue_type": "outliers",
                    "severity": "Critical",
                    "description": f"Found {impossible_count} negative/impossible values in '{col}' (e.g. {sample_val}).",
                    "affected_rows_count": impossible_count,
                    "affected_rows_pct": imp_pct,
                    "sample_rows": imp_indices,
                    "suggested_action": "Convert negatives to positive or replace with median",
                    "action_type": "fix_impossible_values",
                    "options": [
                        {"label": "Convert Negatives to Absolute (Positive)", "value": "abs"},
                        {"label": "Replace with Column Median", "value": "median"},
                        {"label": "Drop Affected Rows", "value": "drop"}
                    ],
                    "before_after_sample": [
                        {"before": f"{sample_val}", "after": f"{abs(sample_val)}"}
                    ],
                    "metadata": {"mode": "abs"}
                })
                validity_scores.append(max(0, 100 - int(imp_pct * 4)))
            elif len(num_series) > 10 and num_series.nunique() > 8 and not any(w in lower_name for w in ["range", "tier", "grade", "rating", "stars", "score", "level", "rank"]):
                q25 = num_series.quantile(0.25)
                q75 = num_series.quantile(0.75)
                iqr = q75 - q25
                lower_iqr = q25 - 1.5 * iqr
                upper_iqr = q75 + 1.5 * iqr
                iqr_outliers = num_series[(num_series < lower_iqr) | (num_series > upper_iqr)]
                if len(iqr_outliers) > 0 and (len(iqr_outliers) / len(num_series) < 0.08):
                    outlier_count = len(iqr_outliers)
                    out_pct = round((outlier_count / len(df_profile)) * 100, 2)
                    out_indices = [int(i) + 1 for i in df_profile.index[iqr_outliers.index][:4]]
                    issues.append({
                        "id": f"outlier_{col}",
                        "column": col,
                        "issue_type": "outliers",
                        "severity": "Warning" if out_pct > 1 else "Info",
                        "description": f"Detected {outlier_count} statistical outliers via IQR in '{col}' (outside [{round(lower_iqr, 1)}, {round(upper_iqr, 1)}]).",
                        "affected_rows_count": outlier_count,
                        "affected_rows_pct": out_pct,
                        "sample_rows": out_indices,
                        "suggested_action": "Winsorize (cap at 99th percentile) or keep",
                        "action_type": "cap_outliers",
                        "options": [
                            {"label": "Cap at 1st / 99th Percentile (Winsorize)", "value": "winsorize"},
                            {"label": "Drop Outlier Rows", "value": "drop"},
                            {"label": "Keep As Is", "value": "keep"}
                        ],
                        "before_after_sample": [
                            {"before": f"{iqr_outliers.iloc[0]}", "after": f"{round(upper_iqr, 2)}"}
                        ],
                        "metadata": {"lower_iqr": lower_iqr, "upper_iqr": upper_iqr}
                    })
                    validity_scores.append(max(0, 100 - int(out_pct * 2)))

        # ISSUE 6: Inconsistent Date Formats / Impossible Dates
        if col_type == "date":
            date_strings = valid_series.astype(str).tolist()
            inconsistent_formats = 0
            impossible_dates = 0
            parsed_samples = []
            
            for s in date_strings[:500]:
                if "31/02" in s or "29/02" in s and not "2024" in s:
                    impossible_dates += 1
                elif "/" in s and "-" in s:
                    inconsistent_formats += 1
                elif "/" in s:
                    inconsistent_formats += 1
            
            if impossible_dates > 0:
                issues.append({
                    "id": f"impossible_date_{col}",
                    "column": col,
                    "issue_type": "inconsistent_dates",
                    "severity": "Critical",
                    "description": f"Found impossible date strings in '{col}' (e.g., February 31).",
                    "affected_rows_count": impossible_dates,
                    "affected_rows_pct": round((impossible_dates / len(df_profile)) * 100, 2),
                    "suggested_action": "Set invalid dates to null or drop rows",
                    "action_type": "drop_nulls",
                    "options": [{"label": "Set Invalid Dates to Null", "value": "null"}, {"label": "Drop Rows", "value": "drop"}],
                    "before_after_sample": [{"before": "31/02/2024", "after": "null"}],
                    "metadata": {}
                })
                validity_scores.append(85)
                
            if inconsistent_formats > 10:
                issues.append({
                    "id": f"date_fmt_{col}",
                    "column": col,
                    "issue_type": "inconsistent_dates",
                    "severity": "Warning",
                    "description": f"Mixed date formats found in '{col}' (e.g., DD/MM/YYYY mixed with YYYY-MM-DD).",
                    "affected_rows_count": inconsistent_formats,
                    "affected_rows_pct": round((inconsistent_formats / len(df_profile)) * 100, 2),
                    "suggested_action": "Standardize to ISO-8601 (YYYY-MM-DD)",
                    "action_type": "parse_dates",
                    "options": [{"label": "Convert to YYYY-MM-DD", "value": "iso"}, {"label": "Convert to MM/DD/YYYY", "value": "us"}],
                    "before_after_sample": [{"before": "15/04/2024", "after": "2024-04-15"}],
                    "metadata": {}
                })
                consistency_scores.append(88)

        # ISSUE 7: Currency / "5k" / Unit inconsistencies
        if col_type == "currency":
            str_series = valid_series.astype(str)
            k_matches = int(str_series.str.contains(r"[kK]", regex=True).sum())
            curr_symbols = int(str_series.str.contains(r"[\$€£₹¥]", regex=True).sum())
            if k_matches > 0 or curr_symbols > 0:
                total_aff = k_matches + curr_symbols
                issues.append({
                    "id": f"units_{col}",
                    "column": col,
                    "issue_type": "unit_inconsistencies",
                    "severity": "Warning",
                    "description": f"Unit & currency formatting inconsistencies in '{col}' (mix of symbols like $, ₹ and '50k' multiplier strings).",
                    "affected_rows_count": total_aff,
                    "affected_rows_pct": round((total_aff / len(df_profile)) * 100, 2),
                    "suggested_action": "Normalize to clean numeric values (expand 'k' to *1000, strip currency symbols)",
                    "action_type": "normalize_units",
                    "options": [{"label": "Normalize to Clean Float", "value": "clean_float"}],
                    "before_after_sample": [
                        {"before": "50k", "after": "50000.00"},
                        {"before": "$1,200.00", "after": "1200.00"}
                    ],
                    "metadata": {}
                })
                consistency_scores.append(85)

    # Correlated Numeric Pairs (|r| > 0.9)
    numeric_cols = [c["name"] for c in column_profiles if c["inferred_type"] in ["integer", "float", "currency"]]
    if len(numeric_cols) >= 2:
        try:
            num_df = df_profile[numeric_cols].apply(pd.to_numeric, errors='coerce').dropna()
            if len(num_df) > 10:
                corr_matrix = num_df.corr().abs()
                for i in range(len(numeric_cols)):
                    for j in range(i + 1, len(numeric_cols)):
                        c1, c2 = numeric_cols[i], numeric_cols[j]
                        val = corr_matrix.loc[c1, c2]
                        if val > 0.9:
                            issues.append({
                                "id": f"corr_{c1}_{c2}",
                                "column": c1,
                                "issue_type": "correlated_columns",
                                "severity": "Info",
                                "description": f"High correlation between '{c1}' and '{c2}' (r = {round(val, 2)}). May cause redundancy in models.",
                                "affected_rows_count": len(num_df),
                                "affected_rows_pct": 100.0,
                                "suggested_action": "Review redundant fields",
                                "action_type": "keep",
                                "options": [{"label": "Keep Both", "value": "keep"}, {"label": f"Drop {c2}", "value": "drop_second"}],
                                "before_after_sample": [],
                                "metadata": {"r": round(val, 2)}
                            })
        except Exception:
            pass

    # Score calculations
    comp_final = int(np.mean(completeness_scores)) if completeness_scores else 100
    valid_final = int(np.mean(validity_scores)) if validity_scores else 100
    consist_final = int(np.mean(consistency_scores)) if consistency_scores else 100
    uniq_final = int(np.mean(uniqueness_scores)) if uniqueness_scores else 100
    overall_health = int(round(comp_final * 0.3 + valid_final * 0.25 + consist_final * 0.25 + uniq_final * 0.2))

    # Deterministic Narrative Generation
    top_crit = [i for i in issues if i["severity"] == "Critical"]
    top_warn = [i for i in issues if i["severity"] == "Warning"]
    top_problems = [i["description"] for i in (top_crit + top_warn)[:5]]

    narrative = generate_narrative_summary(
        dataset_name=dataset_name,
        total_rows=total_rows,
        total_cols=total_cols,
        health_score=overall_health,
        columns=column_profiles,
        issues=issues
    )

    return {
        "dataset_id": dataset_id,
        "dataset_name": dataset_name,
        "total_rows": total_rows,
        "total_columns": total_cols,
        "file_size_bytes": file_size_bytes,
        "is_sampled": is_sampled,
        "sample_rows": sample_rows,
        "health_score": {
            "overall": overall_health,
            "completeness": comp_final,
            "uniqueness": uniq_final,
            "validity": valid_final,
            "consistency": consist_final
        },
        "narrative_summary": narrative,
        "top_problems": top_problems,
        "columns": column_profiles,
        "issues": issues,
        "created_at": datetime.now().isoformat()
    }


def generate_narrative_summary(dataset_name: str, total_rows: int, total_cols: int, health_score: int, columns: List[Dict], issues: List[Dict]) -> str:
    types_count = {}
    for c in columns:
        t = c["inferred_type"]
        types_count[t] = types_count.get(t, 0) + 1

    tone = "in excellent shape" if health_score >= 85 else ("in moderate condition with several fixable flaws" if health_score >= 65 else "critically messy and requires immediate sanitization")
    
    parts = []
    parts.append(f"The dataset '{dataset_name}' contains {total_rows:,} records across {total_cols} attributes and is currently {tone} (Health Score: {health_score}/100).")
    
    # What it appears to be about
    col_names_lower = " ".join([c["name"].lower() for c in columns])
    if any(k in col_names_lower for k in ["order", "sale", "product", "customer", "discount"]):
        parts.append("Based on the column structure, this dataset captures commercial transactional and sales performance data.")
    elif any(k in col_names_lower for k in ["employee", "salary", "department", "hire"]):
        parts.append("Based on the detected fields, this dataset tracks human resources, employee compensation, and organizational records.")
    elif any(k in col_names_lower for k in ["email", "phone", "signup", "user"]):
        parts.append("This dataset appears to be a customer directory and relationship registry.")
    else:
        parts.append("The dataset contains structured operational metrics.")

    crit_issues = [i for i in issues if i["severity"] == "Critical"]
    warn_issues = [i for i in issues if i["severity"] == "Warning"]
    
    if crit_issues:
        parts.append(f"Priority attention is required for {len(crit_issues)} critical problems: {crit_issues[0]['description']}.")
    if warn_issues:
        parts.append(f"Additionally, {len(warn_issues)} consistency warnings were detected, including {warn_issues[0]['description'].lower()}.")

    parts.append("Applying the recommended auto-clean actions below will resolve disguised missing values, standardize formatting, and prepare the dataset for instant visualization and Power BI export.")

    return " ".join(parts)
