"""Lightweight, explicitly non-predictive trend projection.

Per PRD_ARCHITECTURE.md section 8 (Non-Goals): this is a simple linear
fit over the trailing window, used to show direction only. It is not
train/test validated and must not be presented as a forecast with
accuracy guarantees anywhere it is displayed.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

FORECAST_LOOKBACK_DAYS = 60
FORECAST_HORIZON_DAYS = 14

FORECAST_CAVEAT = (
    f"Directional trend estimate only, based on a simple linear fit over the "
    f"trailing {FORECAST_LOOKBACK_DAYS} days of reports. Not a validated "
    f"predictive model - do not treat as a forecast with known accuracy."
)


def project_trend(metrics_df: pd.DataFrame, column: str) -> pd.DataFrame:
    recent = metrics_df.dropna(subset=[column]).tail(FORECAST_LOOKBACK_DAYS)
    if len(recent) < 2:
        return pd.DataFrame(columns=["date", column, "is_forecast"])

    origin = recent["date"].min()
    x = (recent["date"] - origin).dt.days.to_numpy()
    y = recent[column].to_numpy()
    slope, intercept = np.polyfit(x, y, 1)

    last_date = recent["date"].max()
    future_dates = pd.date_range(last_date, periods=FORECAST_HORIZON_DAYS + 1, freq="D")[1:]
    future_x = (future_dates - origin).days.to_numpy()
    projected = slope * future_x + intercept

    return pd.DataFrame(
        {"date": future_dates, column: projected, "is_forecast": True}
    )


def build_forecast(metrics_df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    return {
        "backlog_accumulation_rate": project_trend(metrics_df, "backlog_accumulation_rate"),
        "discharge_effectiveness_index": project_trend(
            metrics_df, "discharge_effectiveness_index"
        ),
    }
