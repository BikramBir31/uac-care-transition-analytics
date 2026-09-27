from __future__ import annotations

import plotly.graph_objects as go
import streamlit as st

from common import get_metrics, init_thresholds, date_range_filter, filter_by_date

st.set_page_config(page_title="Efficiency Panels", layout="wide")
st.title("Transfer & Discharge Efficiency")

metrics_df = get_metrics()
thresholds = init_thresholds()
start, end = date_range_filter(metrics_df)
filtered = filter_by_date(metrics_df, start, end)

if filtered.empty:
    st.warning("No reports in the selected date range.")
    st.stop()

metric_options = {
    "Transfer Efficiency Ratio": "transfer_efficiency_ratio",
    "Discharge Effectiveness Index": "discharge_effectiveness_index",
    "Pipeline Throughput Rate (30D rolling)": "pipeline_throughput_rate",
}
selected_labels = st.multiselect(
    "Metrics to display", list(metric_options), default=list(metric_options)
)

fig = go.Figure()
for label in selected_labels:
    col = metric_options[label]
    fig.add_trace(go.Scatter(x=filtered["date"], y=filtered[col], name=label, mode="lines"))
fig.update_layout(height=450, xaxis_title="Date", yaxis_title="Ratio")
st.plotly_chart(fig, use_container_width=True)

st.subheader("Threshold alerts")
below_transfer = filtered[
    filtered["transfer_efficiency_ratio"] < thresholds["transfer_efficiency_ratio_min"]
]
below_discharge = filtered[
    filtered["discharge_effectiveness_index"] < thresholds["discharge_effectiveness_index_min"]
]
col1, col2 = st.columns(2)
col1.metric("Reports below Transfer Efficiency threshold", len(below_transfer))
col2.metric("Reports below Discharge Effectiveness threshold", len(below_discharge))

with st.expander("Flagged reports"):
    st.dataframe(
        filtered.loc[
            below_transfer.index.union(below_discharge.index),
            ["date", "transfer_efficiency_ratio", "discharge_effectiveness_index"],
        ]
    )
