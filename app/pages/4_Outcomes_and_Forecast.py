from __future__ import annotations

import plotly.graph_objects as go
import streamlit as st

from common import get_metrics, get_forecast, init_thresholds, date_range_filter, filter_by_date
from src.forecasting import FORECAST_CAVEAT

st.set_page_config(page_title="Outcomes & Forecast", layout="wide")
st.title("Outcome Stability & Forecast")

metrics_df = get_metrics()
thresholds = init_thresholds()
start, end = date_range_filter(metrics_df)
filtered = filter_by_date(metrics_df, start, end)

if filtered.empty:
    st.warning("No reports in the selected date range.")
    st.stop()

st.subheader("Outcome Stability Score")
st.caption(
    "Rolling 30-day coefficient of variation of Discharge Effectiveness. "
    "Higher values mean placement outcomes are less consistent."
)
fig = go.Figure()
fig.add_trace(
    go.Scatter(x=filtered["date"], y=filtered["outcome_stability_score"], name="Stability Score")
)
fig.add_hline(
    y=thresholds["outcome_stability_score_max"],
    line_dash="dash",
    annotation_text="Volatility threshold",
)
fig.update_layout(height=400, xaxis_title="Date", yaxis_title="Coefficient of variation")
st.plotly_chart(fig, use_container_width=True)

volatile = filtered[filtered["outcome_stability_score"] > thresholds["outcome_stability_score_max"]]
st.metric("Reports above volatility threshold", len(volatile))

st.divider()
st.subheader("Lightweight trend forecast")
st.warning(FORECAST_CAVEAT)

forecast = get_forecast(metrics_df)
for column, label in [
    ("backlog_accumulation_rate", "Backlog Accumulation Rate"),
    ("discharge_effectiveness_index", "Discharge Effectiveness Index"),
]:
    hist = metrics_df[["date", column]].dropna().tail(60)
    proj = forecast[column]

    trend_fig = go.Figure()
    trend_fig.add_trace(go.Scatter(x=hist["date"], y=hist[column], name="Actual"))
    if not proj.empty:
        trend_fig.add_trace(
            go.Scatter(
                x=proj["date"], y=proj[column], name="Projected (directional)", line=dict(dash="dot")
            )
        )
    trend_fig.update_layout(height=350, title=label, xaxis_title="Date")
    st.plotly_chart(trend_fig, use_container_width=True)
