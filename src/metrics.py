"""KPI, backlog, and outcome-stability calculations.

Formulas follow PLAN.md section 3.2. All rolling calculations use
time-based windows (e.g. "14D") rather than row counts, because the
reporting cadence is irregular (see PLAN.md section 2) - a row-count
window would silently span very different real time periods.
"""

from __future__ import annotations

import pandas as pd

THROUGHPUT_WINDOW = "30D"
BACKLOG_WINDOW = "14D"
STABILITY_WINDOW = "30D"
STABILITY_MIN_PERIODS = 5


def _safe_ratio(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    """Elementwise numerator/denominator, undefined (NaN) when denominator is 0."""
    return numerator / denominator.replace(0, pd.NA)


def compute_kpis(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    out["transfer_efficiency_ratio"] = _safe_ratio(
        out["transferred_out_cbp"], out["cbp_custody"]
    )
    out["discharge_effectiveness_index"] = _safe_ratio(out["discharged"], out["hhs_care"])
    out["is_weekday"] = out["date"].dt.dayofweek < 5

    indexed = out.set_index("date")

    rolling_entries = indexed["apprehended"].rolling(THROUGHPUT_WINDOW).sum()
    rolling_exits = indexed["discharged"].rolling(THROUGHPUT_WINDOW).sum()
    out["pipeline_throughput_rate"] = _safe_ratio(rolling_exits, rolling_entries).to_numpy()

    rolling_inflow = indexed["transferred_out_cbp"].rolling(BACKLOG_WINDOW).sum()
    rolling_outflow = indexed["discharged"].rolling(BACKLOG_WINDOW).sum()
    out["backlog_accumulation_rate"] = (rolling_inflow - rolling_outflow).to_numpy()
    out["is_backlog_window"] = out["backlog_accumulation_rate"] > 0

    dei_rolling = indexed["discharge_effectiveness_index"]
    rolling_mean = dei_rolling.rolling(STABILITY_WINDOW, min_periods=STABILITY_MIN_PERIODS).mean()
    rolling_std = dei_rolling.rolling(STABILITY_WINDOW, min_periods=STABILITY_MIN_PERIODS).std()
    out["outcome_stability_score"] = (rolling_std / rolling_mean).to_numpy()

    return out
