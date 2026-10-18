import pytest
import pandas as pd
import numpy as np
from app.profiler.engine import (
    infer_column_semantic_type, profile_dataset, is_disguised_null
)
from app.cleaner.engine import clean_dataframe, generate_cleaning_recipes
from app.dashboard.engine import suggest_charts_for_dataset, aggregate_chart_data

def test_disguised_null_detection():
    assert is_disguised_null(None) is True
    assert is_disguised_null(np.nan) is True
    assert is_disguised_null("N/A") is True
    assert is_disguised_null("NA") is True
    assert is_disguised_null(" - ") is True
    assert is_disguised_null("unknown") is True
    assert is_disguised_null("Valid Value") is False

def test_semantic_type_inference():
    currencies = pd.Series(["$100.00", "₹5000", "$25.50", "150k", "$80"])
    assert infer_column_semantic_type(currencies, "price") == "currency"

    emails = pd.Series(["alice@example.com", "bob@work.org", "charlie@web.io"])
    assert infer_column_semantic_type(emails, "email") == "email"

    dates = pd.Series(["2024-01-15", "15/02/2024", "2024-03-01", "2024-04-20"])
    assert infer_column_semantic_type(dates, "order_date") == "date"

def test_profiling_and_health_scoring():
    df = pd.DataFrame({
        "order_id": ["A1", "A2", "A2", "A3"], # duplicate A2
        "city": ["Delhi", "delhi ", "Delhi", "Mumbai"], # whitespace & casing
        "amount": [100, -50, 200, 300] # negative impossible amount
    })
    report = profile_dataset(df, "test_1", "Test")
    assert report["total_rows"] == 4
    assert report["health_score"]["overall"] < 100
    
    issue_types = [i["issue_type"] for i in report["issues"]]
    assert "whitespace" in issue_types
    assert "outliers" in issue_types

def test_cleaning_actions():
    df = pd.DataFrame({
        "id": [1, 2, 2, 3],
        "name": [" Alice ", "Bob", "Bob", "Charlie"],
        "price": ["$50", "$100", "$100", "50k"],
        "qty": [2, -5, -5, 10]
    })
    actions = [
        {"action_type": "drop_duplicates", "params": {"keep": "first"}, "description": "Drop dups"},
        {"action_type": "trim_whitespace", "column": "name", "params": {}, "description": "Trim name"},
        {"action_type": "normalize_units", "column": "price", "params": {}, "description": "Clean price"},
        {"action_type": "fix_impossible_values", "column": "qty", "params": {"mode": "abs"}, "description": "Abs qty"}
    ]
    cleaned_df, logs = clean_dataframe(df, actions)
    assert len(cleaned_df) == 3
    assert cleaned_df["name"].iloc[0] == "Alice"
    assert cleaned_df["price"].iloc[2] == 50000.0
    assert (cleaned_df["qty"] >= 0).all()

def test_recipe_generation():
    actions = [
        {"action_type": "drop_duplicates", "params": {}},
        {"action_type": "trim_whitespace", "column": "City"}
    ]
    recipes = generate_cleaning_recipes(actions, "orders.csv")
    assert "import pandas as pd" in recipes["python"]
    assert "Table.Distinct" in recipes["power_query_m"]
    assert "SELECT DISTINCT" in recipes["sql"]
