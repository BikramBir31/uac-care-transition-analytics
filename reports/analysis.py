"""Compute the summary statistics and chart images that back the research
paper and executive summary. Run once; both document-generation scripts
read reports/analysis_summary.json and reports/figures/*.png.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.data_loader import load_and_clean
from src.metrics import compute_kpis
from src.forecasting import build_forecast, FORECAST_CAVEAT

FIG_DIR = Path(__file__).resolve().parent / "figures"
FIG_DIR.mkdir(exist_ok=True)
SUMMARY_PATH = Path(__file__).resolve().parent / "analysis_summary.json"

# dataviz skill reference palette (light mode)
BLUE = "#2a78d6"
ORANGE = "#eb6834"
RED = "#e34948"
GREEN = "#0ca30c"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"
INK = "#0b0b0b"
INK2 = "#52514e"
MUTED = "#898781"
SURFACE = "#fcfcfb"

plt.rcParams.update(
    {
        "figure.facecolor": SURFACE,
        "axes.facecolor": SURFACE,
        "axes.edgecolor": AXIS,
        "axes.labelcolor": INK2,
        "text.color": INK,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "grid.color": GRID,
        "font.size": 11,
        "axes.titlesize": 13,
        "axes.titleweight": "bold",
        "axes.spines.top": False,
        "axes.spines.right": False,
    }
)


def style_axes(ax):
    ax.grid(True, axis="y", linewidth=0.7, color=GRID)
    ax.set_axisbelow(True)
    ax.tick_params(length=0)
    for spine in ("left", "bottom"):
        ax.spines[spine].set_color(AXIS)


def longest_true_run(mask: pd.Series) -> tuple[int, pd.Timestamp | None, pd.Timestamp | None]:
    best_len, best_start, best_end = 0, None, None
    run_len, run_start = 0, None
    for date, val in mask.items():
        if val:
            if run_len == 0:
                run_start = date
            run_len += 1
            if run_len > best_len:
                best_len, best_start, best_end = run_len, run_start, date
        else:
            run_len = 0
    return best_len, best_start, best_end


def main() -> None:
    cleaned = load_and_clean()
    df = compute_kpis(cleaned)
    forecast = build_forecast(df)

    df_indexed = df.set_index("date")
    summary: dict = {}

    summary["date_range"] = {
        "start": df["date"].min().strftime("%B %d, %Y"),
        "end": df["date"].max().strftime("%B %d, %Y"),
    }
    summary["report_count"] = int(len(df))

    latest = df.iloc[-1]
    summary["latest"] = {
        "date": latest["date"].strftime("%B %d, %Y"),
        "cbp_custody": int(latest["cbp_custody"]),
        "hhs_care": int(latest["hhs_care"]),
        "transfer_efficiency_ratio": float(latest["transfer_efficiency_ratio"]),
        "discharge_effectiveness_index": float(latest["discharge_effectiveness_index"]),
    }

    summary["totals"] = {
        "apprehended": int(df["apprehended"].sum()),
        "transferred_out_cbp": int(df["transferred_out_cbp"].sum()),
        "discharged": int(df["discharged"].sum()),
    }

    df["year"] = df["date"].dt.year
    yearly = df.groupby("year").agg(
        reports=("date", "count"),
        avg_transfer_efficiency=("transfer_efficiency_ratio", "mean"),
        avg_discharge_effectiveness=("discharge_effectiveness_index", "mean"),
        avg_hhs_care=("hhs_care", "mean"),
        avg_cbp_custody=("cbp_custody", "mean"),
        total_discharged=("discharged", "sum"),
    )
    summary["yearly"] = {
        str(int(year)): {k: (float(v) if not isinstance(v, (int, np.integer)) else int(v))
                          for k, v in row.items()}
        for year, row in yearly.iterrows()
    }

    backlog_len, backlog_start, backlog_end = longest_true_run(
        df.set_index("date")["is_backlog_window"]
    )
    peak_backlog_idx = df["backlog_accumulation_rate"].idxmax()
    summary["backlog"] = {
        "windows_flagged": int(df["is_backlog_window"].sum()),
        "share_of_reports": float(df["is_backlog_window"].mean()),
        "longest_streak_reports": int(backlog_len),
        "longest_streak_start": backlog_start.strftime("%B %d, %Y") if backlog_start is not None else None,
        "longest_streak_end": backlog_end.strftime("%B %d, %Y") if backlog_end is not None else None,
        "peak_value": float(df.loc[peak_backlog_idx, "backlog_accumulation_rate"]),
        "peak_date": df.loc[peak_backlog_idx, "date"].strftime("%B %d, %Y"),
        "recent_30d_avg": float(df.tail(30)["backlog_accumulation_rate"].mean()),
        "prior_30d_avg": float(df.iloc[-60:-30]["backlog_accumulation_rate"].mean()),
    }

    weekday_avg = df.groupby("is_weekday")["discharge_effectiveness_index"].mean()
    summary["weekday_vs_weekend"] = {
        "weekday_avg_discharge_effectiveness": float(weekday_avg.get(True, float("nan"))),
        "weekend_avg_discharge_effectiveness": float(weekday_avg.get(False, float("nan"))),
    }

    stability_valid = df["outcome_stability_score"].dropna()
    high_vol_threshold = 0.5
    summary["stability"] = {
        "avg_score": float(stability_valid.mean()),
        "median_score": float(stability_valid.median()),
        "high_volatility_reports": int((stability_valid > high_vol_threshold).sum()),
        "high_volatility_threshold": high_vol_threshold,
    }

    monthly = df_indexed["discharge_effectiveness_index"].resample("MS").mean().dropna()
    summary["monthly_discharge_effectiveness"] = {
        d.strftime("%Y-%m"): float(v) for d, v in monthly.items()
    }
    recent_6mo = monthly.tail(6)
    trend_direction = "improving" if recent_6mo.iloc[-1] > recent_6mo.iloc[0] else "declining"
    summary["monthly_trend_direction_last_6mo"] = trend_direction

    def forecast_block(col: str) -> dict:
        fc = forecast[col]
        last_actual = float(df[col].dropna().iloc[-1])
        if fc.empty:
            return {"last_actual": last_actual, "projected": None, "direction": None}
        projected = float(fc.iloc[-1][col])
        direction = "increasing" if projected > last_actual else "decreasing"
        return {"last_actual": last_actual, "projected": projected, "direction": direction}

    summary["forecast"] = {
        "caveat": FORECAST_CAVEAT,
        "backlog_accumulation_rate": forecast_block("backlog_accumulation_rate"),
        "discharge_effectiveness_index": forecast_block("discharge_effectiveness_index"),
    }

    summary["data_quality"] = {
        "anomalies_flagged": int(df["data_quality_flag"].notna().sum()),
        "apprehension_footnote_caveat": (
            "The source column 'Children apprehended and placed in CBP custody' "
            "carries a footnote marker (*) whose definition is not included in "
            "this extract; its exact scope should be confirmed with HHS before "
            "this figure is used in isolation."
        ),
    }

    SUMMARY_PATH.write_text(json.dumps(summary, indent=2))
    print(f"Wrote {SUMMARY_PATH}")

    # ---- Charts ----

    # 1. Active stocks over time
    fig, ax = plt.subplots(figsize=(7.5, 3.2), dpi=200)
    ax.plot(df["date"], df["cbp_custody"], color=BLUE, linewidth=2, label="CBP custody")
    ax.plot(df["date"], df["hhs_care"], color=ORANGE, linewidth=2, label="HHS care")
    style_axes(ax)
    ax.set_title("Active Custody & Care Stocks Over Time")
    ax.set_ylabel("Children")
    ax.legend(frameon=False, loc="upper left")
    ax.xaxis.set_major_locator(mdates.YearLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    fig.tight_layout()
    fig.savefig(FIG_DIR / "01_stocks_over_time.png")
    plt.close(fig)

    # 2a. Transfer efficiency (own scale)
    fig, ax = plt.subplots(figsize=(7.5, 3.2), dpi=200)
    ax.plot(df["date"], df["transfer_efficiency_ratio"], color=BLUE, linewidth=1.1, alpha=0.9)
    style_axes(ax)
    ax.set_title("Transfer Efficiency Ratio")
    ax.set_ylabel("Transfers ÷ CBP custody")
    ax.xaxis.set_major_locator(mdates.YearLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    fig.tight_layout()
    fig.savefig(FIG_DIR / "02a_transfer_efficiency.png")
    plt.close(fig)

    # 2b. Discharge effectiveness (own scale - two orders of magnitude smaller)
    fig, ax = plt.subplots(figsize=(7.5, 3.2), dpi=200)
    ax.plot(df["date"], df["discharge_effectiveness_index"], color=ORANGE, linewidth=1.3)
    style_axes(ax)
    ax.set_title("Discharge Effectiveness Index")
    ax.set_ylabel("Discharges ÷ HHS care")
    ax.xaxis.set_major_locator(mdates.YearLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    fig.tight_layout()
    fig.savefig(FIG_DIR / "02b_discharge_effectiveness.png")
    plt.close(fig)

    # 3. Backlog accumulation (diverging)
    fig, ax = plt.subplots(figsize=(7.5, 3.2), dpi=200)
    pos = df["backlog_accumulation_rate"].clip(lower=0)
    neg = df["backlog_accumulation_rate"].clip(upper=0)
    ax.fill_between(df["date"], pos, 0, color=RED, alpha=0.55, linewidth=0, label="Net inflow (backlog building)")
    ax.fill_between(df["date"], neg, 0, color=BLUE, alpha=0.55, linewidth=0, label="Net outflow (backlog clearing)")
    ax.axhline(0, color=AXIS, linewidth=1)
    style_axes(ax)
    ax.set_title("Backlog Accumulation Rate (14-day rolling net inflow)")
    ax.set_ylabel("Children")
    ax.legend(frameon=False, loc="upper left")
    ax.xaxis.set_major_locator(mdates.YearLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    fig.tight_layout()
    fig.savefig(FIG_DIR / "03_backlog.png")
    plt.close(fig)

    # 4. Outcome stability
    fig, ax = plt.subplots(figsize=(7.5, 3.2), dpi=200)
    ax.plot(df["date"], df["outcome_stability_score"], color=BLUE, linewidth=1.3)
    ax.axhline(high_vol_threshold, color=RED, linewidth=1, linestyle="--", label="Volatility threshold")
    style_axes(ax)
    ax.set_title("Outcome Stability Score (30-day rolling coefficient of variation)")
    ax.set_ylabel("Coefficient of variation")
    ax.legend(frameon=False, loc="upper left")
    ax.xaxis.set_major_locator(mdates.YearLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    fig.tight_layout()
    fig.savefig(FIG_DIR / "04_outcome_stability.png")
    plt.close(fig)

    # 5. Monthly discharge effectiveness trend
    fig, ax = plt.subplots(figsize=(7.5, 3.2), dpi=200)
    ax.plot(monthly.index, monthly.values, color=ORANGE, linewidth=2, marker="o", markersize=3)
    style_axes(ax)
    ax.set_title("Month-Over-Month Discharge Effectiveness")
    ax.set_ylabel("Avg. Discharge Effectiveness Index")
    ax.xaxis.set_major_locator(mdates.YearLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    fig.tight_layout()
    fig.savefig(FIG_DIR / "05_monthly_trend.png")
    plt.close(fig)

    # 6. Forecast: backlog
    fig, ax = plt.subplots(figsize=(7.5, 3.2), dpi=200)
    hist = df[["date", "backlog_accumulation_rate"]].dropna().tail(60)
    proj = forecast["backlog_accumulation_rate"]
    ax.plot(hist["date"], hist["backlog_accumulation_rate"], color=BLUE, linewidth=2, label="Actual")
    if not proj.empty:
        ax.plot(
            proj["date"], proj["backlog_accumulation_rate"], color=RED, linewidth=2,
            linestyle=":", label="Projected (directional)",
        )
    ax.axhline(0, color=AXIS, linewidth=1)
    style_axes(ax)
    ax.set_title("Backlog Accumulation Rate: Trailing 60 Days & Projection", fontsize=12)
    ax.set_ylabel("Children")
    ax.legend(frameon=False, loc="upper left")
    ax.xaxis.set_major_locator(mdates.WeekdayLocator(interval=2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
    fig.autofmt_xdate(rotation=30, ha="right")
    fig.tight_layout()
    fig.savefig(FIG_DIR / "06_forecast_backlog.png")
    plt.close(fig)

    print(f"Wrote {len(list(FIG_DIR.glob('*.png')))} chart(s) to {FIG_DIR}")


if __name__ == "__main__":
    main()
