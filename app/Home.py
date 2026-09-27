from __future__ import annotations

import pandas as pd
import streamlit as st

from common import get_metrics, init_thresholds, date_range_filter, filter_by_date

st.set_page_config(page_title="UAC Care Transition Analytics", layout="wide")

st.title("Care Transition Efficiency & Placement Outcome Analytics")
st.caption(
    "HHS Unaccompanied Alien Children Program - process efficiency and "
    "outcome-stability view of the CBP custody to HHS discharge pipeline."
)

metrics_df = get_metrics()
init_thresholds()
start, end = date_range_filter(metrics_df)
filtered = filter_by_date(metrics_df, start, end)

st.subheader("Snapshot - most recent report in range")

if filtered.empty:
    st.warning("No reports in the selected date range.")
else:
    latest = filtered.iloc[-1]
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Children in CBP custody", f"{latest['cbp_custody']:,.0f}")
    col2.metric("Children in HHS care", f"{latest['hhs_care']:,.0f}")
    col3.metric(
        "Transfer Efficiency Ratio",
        f"{latest['transfer_efficiency_ratio']:.2f}"
        if pd.notna(latest["transfer_efficiency_ratio"])
        else "n/a",
    )
    col4.metric(
        "Discharge Effectiveness Index",
        f"{latest['discharge_effectiveness_index']:.2f}"
        if pd.notna(latest["discharge_effectiveness_index"])
        else "n/a",
    )

    st.caption(
        f"{len(filtered)} reports between {start.date()} and {end.date()}. "
        "Reporting cadence is irregular - gaps between reports are expected, "
        "not missing data."
    )

    anomalies = filtered[filtered["data_quality_flag"].notna()]
    if not anomalies.empty:
        st.warning(
            f"{len(anomalies)} report(s) in range are flagged for review "
            f"({', '.join(sorted(anomalies['data_quality_flag'].unique()))})."
        )

st.info(
    "Use the pages in the sidebar for pipeline flow, efficiency panels, "
    "bottleneck detection, and outcome/forecast views."
)
