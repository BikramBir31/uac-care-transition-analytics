"""Shared data loading, caching, and sidebar controls for every page.

Every page imports from here rather than calling src.* directly, so the
dashboard, and later the report-generation scripts, all read the same
computed KPI table (PRD_ARCHITECTURE.md section 4's "single source of
truth" principle).
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import streamlit as st

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.data_loader import load_and_clean, save_processed, RAW_CSV_PATH  # noqa: E402
from src.metrics import compute_kpis  # noqa: E402
from src.forecasting import build_forecast  # noqa: E402

THRESHOLD_DEFAULTS = {
    "transfer_efficiency_ratio_min": 0.2,
    "discharge_effectiveness_index_min": 0.05,
    "outcome_stability_score_max": 0.5,
}


@st.cache_data
def get_metrics() -> pd.DataFrame:
    cleaned = load_and_clean(RAW_CSV_PATH)
    save_processed(cleaned)
    return compute_kpis(cleaned)


@st.cache_data
def get_forecast(metrics_df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    return build_forecast(metrics_df)


def init_thresholds() -> dict:
    st.sidebar.subheader("Alert thresholds")
    return {
        "transfer_efficiency_ratio_min": st.sidebar.slider(
            "Min Transfer Efficiency Ratio",
            0.0,
            2.0,
            THRESHOLD_DEFAULTS["transfer_efficiency_ratio_min"],
            0.01,
            key="transfer_efficiency_ratio_min",
        ),
        "discharge_effectiveness_index_min": st.sidebar.slider(
            "Min Discharge Effectiveness Index",
            0.0,
            1.0,
            THRESHOLD_DEFAULTS["discharge_effectiveness_index_min"],
            0.01,
            key="discharge_effectiveness_index_min",
        ),
        "outcome_stability_score_max": st.sidebar.slider(
            "Max Outcome Stability Score (volatility)",
            0.0,
            2.0,
            THRESHOLD_DEFAULTS["outcome_stability_score_max"],
            0.05,
            key="outcome_stability_score_max",
        ),
    }


def date_range_filter(df: pd.DataFrame) -> tuple[pd.Timestamp, pd.Timestamp]:
    min_date, max_date = df["date"].min().date(), df["date"].max().date()
    start, end = st.sidebar.date_input(
        "Date range",
        value=(min_date, max_date),
        min_value=min_date,
        max_value=max_date,
        key="global_date_range",
    )
    return pd.Timestamp(start), pd.Timestamp(end)


def filter_by_date(df: pd.DataFrame, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame:
    return df[(df["date"] >= start) & (df["date"] <= end)]
