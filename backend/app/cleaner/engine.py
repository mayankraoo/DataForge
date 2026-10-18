import re
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
from rapidfuzz import process, fuzz
from app.profiler.engine import is_disguised_null

def parse_currency_or_k_number(val: Any) -> Any:
    if pd.isna(val) or is_disguised_null(val):
        return np.nan
    s = str(val).strip()
    # Check 50k, 5k, etc.
    k_match = re.match(r"^([+-]?\d+(?:\.\d+)?)\s*[kK]$", s)
    if k_match:
        try:
            return float(k_match.group(1)) * 1000.0
        except Exception:
            pass
    # Clean currency symbols and commas
    cleaned_str = re.sub(r"[^\d.-]", "", s)
    try:
        return float(cleaned_str) if cleaned_str else np.nan
    except Exception:
        return np.nan

def clean_dataframe(df: pd.DataFrame, actions: List[Dict[str, Any]]) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    df_cleaned = df.copy()
    applied_logs = []

    for act in actions:
        atype = act.get("action_type")
        col = act.get("column")
        params = act.get("params", {})
        
        try:
            if atype == "drop_duplicates":
                keep_val = params.get("keep", "first")
                keep_arg = False if keep_val == "none" else ("first" if keep_val == "first" else "last")
                orig_len = len(df_cleaned)
                df_cleaned = df_cleaned.drop_duplicates(keep=keep_arg)
                applied_logs.append({
                    "action_type": atype,
                    "description": f"Dropped {orig_len - len(df_cleaned)} duplicate rows (keep={keep_val})"
                })

            elif atype in ["drop_nulls", "drop_missing"]:
                if col and col in df_cleaned.columns:
                    mask = df_cleaned[col].apply(is_disguised_null)
                    df_cleaned = df_cleaned[~mask]
                    applied_logs.append({
                        "action_type": atype,
                        "column": col,
                        "description": f"Dropped rows with missing values in '{col}'"
                    })

            elif atype in ["fill_median", "fill_mean", "fill_zero", "fill_mode", "fill_constant"]:
                if col and col in df_cleaned.columns:
                    # Ensure column dtype allows mixed/numeric assignments if currently pandas StringDtype
                    if str(df_cleaned[col].dtype).startswith("string") or str(df_cleaned[col].dtype).startswith("str"):
                        df_cleaned[col] = df_cleaned[col].astype(object)
                    mask = df_cleaned[col].apply(is_disguised_null)
                    if atype == "fill_median":
                        num_series = pd.to_numeric(
                            df_cleaned[col].astype(str).str.replace(r"[^\d.-]", "", regex=True),
                            errors='coerce'
                        )
                        med = num_series.median()
                        val_to_set = float(med) if not pd.isna(med) else 0.0
                        # If original column was string formatted, format as string or float
                        if df_cleaned[col].dropna().astype(str).str.contains(r"[^\d.-]").any():
                            df_cleaned.loc[mask, col] = str(round(val_to_set, 2))
                        else:
                            df_cleaned.loc[mask, col] = val_to_set
                        applied_logs.append({"action_type": atype, "column": col, "description": f"Filled nulls in '{col}' with median ({round(val_to_set, 2)})"})
                    elif atype == "fill_mean":
                        num_series = pd.to_numeric(
                            df_cleaned[col].astype(str).str.replace(r"[^\d.-]", "", regex=True),
                            errors='coerce'
                        )
                        mean_val = round(float(num_series.mean()), 2) if not pd.isna(num_series.mean()) else 0.0
                        if df_cleaned[col].dropna().astype(str).str.contains(r"[^\d.-]").any():
                            df_cleaned.loc[mask, col] = str(mean_val)
                        else:
                            df_cleaned.loc[mask, col] = mean_val
                        applied_logs.append({"action_type": atype, "column": col, "description": f"Filled nulls in '{col}' with mean ({mean_val})"})
                    elif atype == "fill_zero":
                        df_cleaned.loc[mask, col] = 0
                        applied_logs.append({"action_type": atype, "column": col, "description": f"Filled nulls in '{col}' with 0"})
                    elif atype == "fill_mode":
                        valid_series = df_cleaned[col][~mask]
                        mode_val = valid_series.mode()[0] if len(valid_series) > 0 else "Unknown"
                        df_cleaned.loc[mask, col] = mode_val
                        applied_logs.append({"action_type": atype, "column": col, "description": f"Filled nulls in '{col}' with mode ('{mode_val}')"})
                    elif atype == "fill_constant":
                        const_val = params.get("value", "Unknown")
                        df_cleaned.loc[mask, col] = const_val
                        applied_logs.append({"action_type": atype, "column": col, "description": f"Filled nulls in '{col}' with constant '{const_val}'"})

            elif atype == "trim_whitespace":
                if col and col in df_cleaned.columns:
                    df_cleaned[col] = df_cleaned[col].astype(str).str.strip()
                    if params.get("titlecase"):
                        df_cleaned[col] = df_cleaned[col].str.title()
                    applied_logs.append({"action_type": atype, "column": col, "description": f"Trimmed whitespace in '{col}'"})

            elif atype == "merge_categories":
                if col and col in df_cleaned.columns:
                    # Apply canonical replacements
                    merge_groups = params.get("merge_groups", [])
                    if not merge_groups:
                        # Auto detect
                        unique_cats = list(df_cleaned[col].astype(str).str.strip().unique())
                        seen = set()
                        for cat in unique_cats:
                            if cat in seen or len(cat) < 3:
                                continue
                            matches = process.extract(cat, unique_cats, scorer=fuzz.token_sort_ratio, score_cutoff=80, limit=6)
                            cluster = [m[0] for m in matches if m[0] != cat and m[1] >= 80]
                            if cluster:
                                all_v = [cat] + cluster
                                canonical = cat.strip().title()
                                merge_groups.append({"canonical": canonical, "variants": all_v})
                                for v in all_v:
                                    seen.add(v)

                    rep_map = {}
                    for g in merge_groups:
                        canonical = g["canonical"]
                        for v in g["variants"]:
                            rep_map[v] = canonical
                    
                    df_cleaned[col] = df_cleaned[col].astype(str).str.strip().replace(rep_map)
                    applied_logs.append({"action_type": atype, "column": col, "description": f"Merged {len(rep_map)} category variants in '{col}'"})

            elif atype == "normalize_units":
                if col and col in df_cleaned.columns:
                    df_cleaned[col] = df_cleaned[col].apply(parse_currency_or_k_number)
                    applied_logs.append({"action_type": atype, "column": col, "description": f"Normalized currency and 'k' units in '{col}' to numeric"})

            elif atype == "fix_impossible_values":
                if col and col in df_cleaned.columns:
                    fix_mode = params.get("mode", "abs")
                    num_series = pd.to_numeric(df_cleaned[col], errors='coerce')
                    if fix_mode == "abs":
                        df_cleaned[col] = num_series.abs()
                        applied_logs.append({"action_type": atype, "column": col, "description": f"Converted negative values in '{col}' to absolute numbers"})
                    elif fix_mode == "median":
                        positives = num_series[num_series > 0]
                        med = positives.median() if len(positives) > 0 else 0
                        df_cleaned.loc[num_series < 0, col] = med
                        applied_logs.append({"action_type": atype, "column": col, "description": f"Replaced negative values in '{col}' with median ({med})"})
                    elif fix_mode == "drop":
                        df_cleaned = df_cleaned[num_series >= 0]
                        applied_logs.append({"action_type": atype, "column": col, "description": f"Dropped rows with negative values in '{col}'"})

            elif atype == "cap_outliers":
                if col and col in df_cleaned.columns:
                    num_series = pd.to_numeric(df_cleaned[col], errors='coerce')
                    lower_cap = num_series.quantile(0.01)
                    upper_cap = num_series.quantile(0.99)
                    df_cleaned[col] = num_series.clip(lower=lower_cap, upper=upper_cap)
                    applied_logs.append({"action_type": atype, "column": col, "description": f"Winsorized outliers in '{col}' to [p01: {round(lower_cap,2)}, p99: {round(upper_cap,2)}]"})

            elif atype == "parse_dates":
                if col and col in df_cleaned.columns:
                    # Clean impossible dates first like 31/02
                    df_cleaned[col] = pd.to_datetime(df_cleaned[col], format='mixed', errors='coerce').dt.strftime('%Y-%m-%d')
                    applied_logs.append({"action_type": atype, "column": col, "description": f"Standardized dates in '{col}' to ISO YYYY-MM-DD"})

            elif atype == "drop_column":
                if col and col in df_cleaned.columns:
                    df_cleaned = df_cleaned.drop(columns=[col])
                    applied_logs.append({"action_type": atype, "column": col, "description": f"Dropped column '{col}'"})

            elif atype == "change_type":
                target_type = params.get("target_type")
                if col and target_type and col in df_cleaned.columns:
                    if target_type == "integer":
                        df_cleaned[col] = pd.to_numeric(df_cleaned[col], errors='coerce').fillna(0).astype(int)
                    elif target_type == "float":
                        df_cleaned[col] = pd.to_numeric(df_cleaned[col], errors='coerce')
                    elif target_type == "string":
                        df_cleaned[col] = df_cleaned[col].astype(str)
                    elif target_type == "datetime":
                        df_cleaned[col] = pd.to_datetime(df_cleaned[col], errors='coerce').dt.strftime('%Y-%m-%d')
                    applied_logs.append({"action_type": atype, "column": col, "description": f"Changed type of '{col}' to {target_type}"})

            elif atype == "split_column":
                delimiter = params.get("delimiter", " ")
                col1 = params.get("new_col1", f"{col}_1")
                col2 = params.get("new_col2", f"{col}_2")
                if col and col in df_cleaned.columns:
                    split_df = df_cleaned[col].astype(str).str.split(delimiter, n=1, expand=True)
                    df_cleaned[col1] = split_df[0] if 0 in split_df.columns else ""
                    df_cleaned[col2] = split_df[1] if 1 in split_df.columns else ""
                    applied_logs.append({"action_type": atype, "column": col, "description": f"Split '{col}' into '{col1}' and '{col2}' by '{delimiter}'"})

            elif atype == "merge_columns":
                col2 = params.get("second_column")
                new_col = params.get("new_col_name", f"{col}_{col2}")
                separator = params.get("separator", " ")
                if col and col2 and col in df_cleaned.columns and col2 in df_cleaned.columns:
                    df_cleaned[new_col] = df_cleaned[col].astype(str) + separator + df_cleaned[col2].astype(str)
                    applied_logs.append({"action_type": atype, "column": col, "description": f"Merged '{col}' and '{col2}' into '{new_col}'"})

            elif atype == "find_replace":
                find_val = params.get("find")
                replace_val = params.get("replace", "")
                if col and col in df_cleaned.columns and find_val is not None:
                    df_cleaned[col] = df_cleaned[col].astype(str).str.replace(str(find_val), str(replace_val), regex=False)
                    applied_logs.append({"action_type": atype, "column": col, "description": f"Replaced '{find_val}' with '{replace_val}' in '{col}'"})

            elif atype == "filter_rows":
                operator = params.get("operator", "equals")
                filter_val = params.get("value", "")
                if col and col in df_cleaned.columns:
                    orig_len = len(df_cleaned)
                    if operator == "equals":
                        df_cleaned = df_cleaned[df_cleaned[col].astype(str) == str(filter_val)]
                    elif operator == "not_equals":
                        df_cleaned = df_cleaned[df_cleaned[col].astype(str) != str(filter_val)]
                    elif operator == "greater_than":
                        df_cleaned = df_cleaned[pd.to_numeric(df_cleaned[col], errors='coerce') > float(filter_val)]
                    elif operator == "less_than":
                        df_cleaned = df_cleaned[pd.to_numeric(df_cleaned[col], errors='coerce') < float(filter_val)]
                    elif operator == "contains":
                        df_cleaned = df_cleaned[df_cleaned[col].astype(str).str.contains(str(filter_val), case=False, na=False)]
                    applied_logs.append({"action_type": atype, "column": col, "description": f"Filtered rows on '{col}' {operator} '{filter_val}' (kept {len(df_cleaned)}/{orig_len})"})

            elif atype == "derive_formula":
                new_col = params.get("new_col_name")
                formula = params.get("formula", "") # e.g. "col1 * col2" or "col1 + 10"
                if new_col and formula:
                    try:
                        # Safe evaluation against columns in dataframe
                        eval_scope = {c: pd.to_numeric(df_cleaned[c], errors='coerce') for c in df_cleaned.columns}
                        df_cleaned[new_col] = pd.eval(formula, local_dict=eval_scope, engine='python')
                        applied_logs.append({"action_type": atype, "description": f"Derived '{new_col}' = {formula}"})
                    except Exception as eval_err:
                        applied_logs.append({"action_type": atype, "error": f"Formula evaluation error: {str(eval_err)}"})

            elif atype in ["keep", "dismiss"]:
                applied_logs.append({"action_type": atype, "column": col, "description": f"Retained / acknowledged '{col}' for analysis"})

        except Exception as e:
            applied_logs.append({"action_type": atype, "column": col, "error": str(e)})

    return df_cleaned, applied_logs


def generate_cleaning_recipes(actions: List[Dict[str, Any]], dataset_name: str) -> Dict[str, str]:
    # 1. Python (Pandas) Script
    py_lines = [
        f"# Auto-generated DataForge Cleaning Script for: {dataset_name}",
        "import pandas as pd",
        "import numpy as np",
        "import re",
        "",
        "# Load raw dataset",
        f"df = pd.read_csv('{dataset_name}')  # Adjust path as necessary",
        ""
    ]
    
    # 2. SQL Transformations
    sql_lines = [
        f"-- Auto-generated DataForge SQL Cleaning Script for: {dataset_name}",
        f"WITH cleaned_step AS (",
        f"    SELECT"
    ]
    
    # 3. Power Query M Script
    m_lines = [
        f"// Auto-generated Power Query M Recipe for: {dataset_name}",
        "let",
        f'    Source = Csv.Document(File.Contents("{dataset_name}"),[Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.None]),',
        '    #"Promoted Headers" = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),'
    ]
    
    step_num = 1
    for act in actions:
        atype = act.get("action_type")
        col = act.get("column")
        params = act.get("params", {})
        
        if atype == "drop_duplicates":
            py_lines.append("# Drop duplicate rows")
            py_lines.append("df = df.drop_duplicates(keep='first')\n")
            m_lines.append(f'    #"Removed Duplicates" = Table.Distinct(#"Promoted Headers"),')
            
        elif atype == "trim_whitespace" and col:
            py_lines.append(f"# Trim whitespace in {col}")
            py_lines.append(f"df['{col}'] = df['{col}'].astype(str).str.strip()\n")
            m_lines.append(f'    #"Trimmed Text {step_num}" = Table.TransformColumns(#"Removed Duplicates", {{"{col}", Text.Trim, type text}}),')
            step_num += 1

        elif atype == "normalize_units" and col:
            py_lines.append(f"# Normalize currency symbols and 'k' in {col}")
            py_lines.append(f"def clean_num_{step_num}(v):")
            py_lines.append(f"    if pd.isna(v): return np.nan")
            py_lines.append(f"    s = str(v).strip()")
            py_lines.append(f"    if s.lower().endswith('k'):")
            py_lines.append(f"        return float(re.sub(r'[^\\d.-]', '', s)) * 1000")
            py_lines.append(f"    return float(re.sub(r'[^\\d.-]', '', s)) if re.sub(r'[^\\d.-]', '', s) else np.nan")
            py_lines.append(f"df['{col}'] = df['{col}'].apply(clean_num_{step_num})\n")
            m_lines.append(f'    #"Cleaned Units {step_num}" = Table.TransformColumns(#"Trimmed Text {step_num-1}", {{"{col}", each try Number.From(Text.Replace(Text.Replace(_, "$", ""), ",", "")) otherwise null, type number}}),')
            step_num += 1

        elif atype == "fill_median" and col:
            py_lines.append(f"# Fill nulls in {col} with median")
            py_lines.append(f"median_val = df['{col}'].median()")
            py_lines.append(f"df['{col}'] = df['{col}'].fillna(median_val)\n")
            
        elif atype == "merge_categories" and col:
            py_lines.append(f"# Merge category variants in {col}")
            py_lines.append(f"df['{col}'] = df['{col}'].astype(str).str.strip().str.title()\n")

        elif atype == "parse_dates" and col:
            py_lines.append(f"# Parse dates in {col} to YYYY-MM-DD")
            py_lines.append(f"df['{col}'] = pd.to_datetime(df['{col}'], format='mixed', errors='coerce').dt.strftime('%Y-%m-%d')\n")

        elif atype == "fix_impossible_values" and col:
            py_lines.append(f"# Fix negative values in {col} to absolute values")
            py_lines.append(f"df['{col}'] = df['{col}'].abs()\n")

    py_lines.append("# Save cleaned dataset")
    py_lines.append(f"df.to_csv('cleaned_{dataset_name}', index=False)")
    py_lines.append("print('Cleaning complete!')")

    # Finalize SQL
    sql_lines.append("        *")
    sql_lines.append(f"    FROM raw_{dataset_name}")
    sql_lines.append(")")
    sql_lines.append("SELECT DISTINCT * FROM cleaned_step;")

    # Finalize M
    m_lines.append('    #"Final Output" = #"Removed Duplicates"')
    m_lines.append("in")
    m_lines.append('    #"Final Output"')

    return {
        "python": "\n".join(py_lines),
        "sql": "\n".join(sql_lines),
        "power_query_m": "\n".join(m_lines)
    }
