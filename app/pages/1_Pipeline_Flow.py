from __future__ import annotations

import plotly.graph_objects as go
import streamlit as st

from common import get_metrics, date_range_filter, filter_by_date

st.set_page_config(page_title="Pipeline Flow", layout="wide")
st.title("Care Pipeline Flow")
st.caption("Apprehension & CBP custody -> Transfer to HHS -> Discharge & sponsor placement")

metrics_df = get_metrics()
start, end = date_range_filter(metrics_df)
filtered = filter_by_date(metrics_df, start, end)

if filtered.empty:
    st.warning("No reports in the selected date range.")
    st.stop()

latest = filtered.iloc[-1]

st.subheader(f"Flow volumes on most recent report ({latest['date'].date()})")
sankey = go.Figure(
    go.Sankey(
        node=dict(
            label=["Apprehended", "CBP Custody", "HHS Care", "Discharged"],
            pad=20,
            thickness=20,
        ),
        link=dict(
            source=[0, 1, 2],
            target=[1, 2, 3],
            value=[
                max(latest["apprehended"], 0.01),
                max(latest["transferred_out_cbp"], 0.01),
                max(latest["discharged"], 0.01),
            ],
        ),
    )
)
sankey.update_layout(height=400)
st.plotly_chart(sankey, use_container_width=True)

st.subheader("Active stocks over time")
stock_fig = go.Figure()
stock_fig.add_trace(go.Scatter(x=filtered["date"], y=filtered["cbp_custody"], name="CBP Custody"))
stock_fig.add_trace(go.Scatter(x=filtered["date"], y=filtered["hhs_care"], name="HHS Care"))
stock_fig.update_layout(height=400, xaxis_title="Date", yaxis_title="Children")
st.plotly_chart(stock_fig, use_container_width=True)

st.subheader("Daily flow volumes")
flow_fig = go.Figure()
flow_fig.add_trace(go.Bar(x=filtered["date"], y=filtered["apprehended"], name="Apprehended"))
flow_fig.add_trace(
    go.Bar(x=filtered["date"], y=filtered["transferred_out_cbp"], name="Transferred to HHS")
)
flow_fig.add_trace(go.Bar(x=filtered["date"], y=filtered["discharged"], name="Discharged"))
flow_fig.update_layout(barmode="group", height=400, xaxis_title="Date", yaxis_title="Children")
st.plotly_chart(flow_fig, use_container_width=True)
