import io
import zipfile
import pandas as pd
from typing import Dict, List, Any

def generate_powerbi_handoff_package(df: pd.DataFrame, dataset_name: str, columns: List[Dict[str, Any]], cleaning_actions: List[Dict[str, Any]]) -> bytes:
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        # 1. Cleaned CSV
        csv_bytes = df.to_csv(index=False).encode('utf-8')
        zf.writestr(f"cleaned_data/{dataset_name}_cleaned.csv", csv_bytes)

        # 2. Cleaned Excel
        xlsx_buffer = io.BytesIO()
        df.to_excel(xlsx_buffer, index=False, engine='openpyxl')
        zf.writestr(f"cleaned_data/{dataset_name}_cleaned.xlsx", xlsx_buffer.getvalue())

        # 3. Cleaned Parquet
        parquet_buffer = io.BytesIO()
        df.to_parquet(parquet_buffer, index=False)
        zf.writestr(f"cleaned_data/{dataset_name}_cleaned.parquet", parquet_buffer.getvalue())

        # 4. Data Dictionary (Markdown + CSV)
        dict_rows = []
        md_table = ["# Data Dictionary: " + dataset_name, "", "| Column | Inferred Type | Missing % | Unique Count | Sample Values |", "| --- | --- | --- | --- | --- |"]
        for c in columns:
            samples = ", ".join([str(x) for x in c.get("sample_values", [])[:3]])
            md_table.append(f"| {c['name']} | {c['inferred_type']} | {c['missing_pct']}% | {c['unique_count']} | `{samples}` |")
            dict_rows.append({
                "Column": c["name"],
                "InferredType": c["inferred_type"],
                "MissingPct": c["missing_pct"],
                "UniqueCount": c["unique_count"],
                "Sample": samples
            })
        zf.writestr("documentation/DATA_DICTIONARY.md", "\n".join(md_table).encode('utf-8'))
        dict_df = pd.DataFrame(dict_rows)
        zf.writestr("documentation/data_dictionary.csv", dict_df.to_csv(index=False).encode('utf-8'))

        # 5. Star-Schema Split (Dimension Tables vs Fact Table)
        id_cols = [c["name"] for c in columns if "id" in c["name"].lower() or c["inferred_type"] == "id_key"]
        cat_cols = [c["name"] for c in columns if c["inferred_type"] in ["category", "free_text"] and c["unique_count"] < 100]
        num_cols = [c["name"] for c in columns if c["inferred_type"] in ["integer", "float", "currency"]]
        
        # Customer Dim
        cust_cols = [c for c in df.columns if any(k in c.lower() for k in ["cust", "client", "buyer"])]
        if cust_cols:
            dim_cust = df[cust_cols].drop_duplicates()
            zf.writestr("star_schema/Dim_Customers.csv", dim_cust.to_csv(index=False).encode('utf-8'))

        # Product Dim
        prod_cols = [c for c in df.columns if any(k in c.lower() for k in ["prod", "item", "sku"])]
        if prod_cols:
            dim_prod = df[prod_cols].drop_duplicates()
            zf.writestr("star_schema/Dim_Products.csv", dim_prod.to_csv(index=False).encode('utf-8'))

        # Date Dim
        date_cols = [c["name"] for c in columns if c["inferred_type"] in ["date", "datetime"]]
        if date_cols:
            dates = pd.to_datetime(df[date_cols[0]], errors='coerce').dropna().unique()
            if len(dates) > 0:
                dim_date = pd.DataFrame({"Date": dates})
                dim_date["Year"] = dim_date["Date"].dt.year
                dim_date["Month"] = dim_date["Date"].dt.month
                dim_date["MonthName"] = dim_date["Date"].dt.month_name()
                dim_date["Quarter"] = dim_date["Date"].dt.quarter
                dim_date["DayOfWeek"] = dim_date["Date"].dt.day_name()
                zf.writestr("star_schema/Dim_Date.csv", dim_date.to_csv(index=False).encode('utf-8'))

        # 6. Auto-generated DAX Starter Measures
        dax_lines = [
            f"// Starter DAX Measures for {dataset_name}",
            f"// Copy and paste into Power BI Desktop (Modeling > New Measure)",
            "",
            f"Total Records = COUNTROWS('{dataset_name}')",
            ""
        ]
        for n in num_cols:
            clean_n = n.replace(" ", "")
            dax_lines.append(f"Total {clean_n} = SUM('{dataset_name}'[{n}])")
            dax_lines.append(f"Average {clean_n} = AVERAGE('{dataset_name}'[{n}])")
            if date_cols:
                dax_lines.append(f"{clean_n} YTD = TOTALYTD(SUM('{dataset_name}'[{n}]), '{dataset_name}'[{date_cols[0]}])")
                dax_lines.append(f"{clean_n} Prior Period = CALCULATE(SUM('{dataset_name}'[{n}]), DATEADD('{dataset_name}'[{date_cols[0]}], -1, MONTH))")
            dax_lines.append("")

        zf.writestr("power_bi/DAX_Measures.dax", "\n".join(dax_lines).encode('utf-8'))

        # 7. Power Query M Script
        from app.cleaner.engine import generate_cleaning_recipes
        recipes = generate_cleaning_recipes(cleaning_actions, dataset_name)
        zf.writestr("power_bi/Transformations.m", recipes["power_query_m"].encode('utf-8'))

        # 8. HOW_TO_OPEN_IN_POWER_BI.md
        guide_text = f"""# How to Open Your Cleaned Data in Power BI Desktop

Follow these simple steps to import your DataForge package into Power BI:

### Step 1: Open Power BI Desktop
1. Launch Power BI Desktop on your computer.
2. Select **Get Data** > **Text/CSV** (or **Excel Workbook** / **Parquet**).
3. Browse to the extracted `cleaned_data/{dataset_name}_cleaned.csv` from this ZIP package and click **Load**.

### Step 2: Use the Star Schema (Recommended)
1. For multi-table dimensional modeling, import the files in the `star_schema/` folder (`Dim_Customers.csv`, `Dim_Products.csv`, etc.).
2. Go to the **Model View** tab on the left navigation bar.
3. Drag the key column (e.g. `CustomerID`) from your Fact table to the corresponding Dimension table to establish relationships.

### Step 3: Add Auto-Generated DAX Measures
1. Open the file `power_bi/DAX_Measures.dax`.
2. In Power BI Desktop, click **Modeling** > **New Measure** on the top ribbon.
3. Paste each measure formula into the formula bar.

### Step 4: Verify Data Quality
Review `documentation/DATA_DICTIONARY.md` to confirm all column data types match your business expectations.

---
*Created with DataForge — Automated Data Preparation & Dashboards*
"""
        zf.writestr("HOW_TO_OPEN_IN_POWER_BI.md", guide_text.encode('utf-8'))

    zip_buffer.seek(0)
    return zip_buffer.getvalue()
