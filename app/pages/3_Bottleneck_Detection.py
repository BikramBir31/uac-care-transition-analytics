from __future__ import annotations

import plotly.graph_objects as go
import streamlit as st

from common import get_metrics, date_range_filter, filter_by_date

st.set_page_config(page_title="Bottleneck Detection", layout="wide")
st.title("Backlog & Bottleneck Detection")

metrics_df = get_metrics()
start, end = date_range_filter(metrics_df)
filtered = filter_by_date(metrics_df, start, end)

if filtered.empty:
    st.warning("No reports in the selected date range.")
    st.stop()

st.caption(
    "Backlog Accumulation Rate = rolling 14-day (transferred-in minus discharged). "
    "Positive values mean HHS-care inflow is outpacing discharges over that window."
)

fig = go.Figure()
fig.add_trace(
    go.Scatter(
        x=filtered["date"],
        y=filtered["backlog_accumulation_rate"],
        name="Backlog Accumulation Rate",
        fill="tozeroy",
    )
)
fig.add_hline(y=0, line_dash="dash")
fig.update_layout(height=450, xaxis_title="Date", yaxis_title="Net inflow (14-day rolling)")
st.plotly_chart(fig, use_container_width=True)

backlog_windows = filtered[filtered["is_backlog_window"]]
st.metric(
    "Reports in an active backlog window",
    len(backlog_windows),
    help="Reports where the 14-day rolling inflow exceeds discharges.",
)

st.subheader("Weekday vs. weekend discharge effectiveness")
st.caption(
    "Reporting is irregular, so this compares only days that were actually "
    "reported in range - it does not assume full calendar coverage."
)
weekday_avg = filtered.groupby("is_weekday")["discharge_effectiveness_index"].mean()
weekday_avg.index = weekday_avg.index.map({True: "Weekday", False: "Weekend"})
st.bar_chart(weekday_avg)

st.subheader("Month-over-month discharge effectiveness")
monthly = (
    filtered.set_index("date")["discharge_effectiveness_index"].resample("MS").mean()
)
st.line_chart(monthly)
