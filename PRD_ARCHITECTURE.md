# PRD & System Architecture — Care Transition Efficiency & Placement Outcome Analytics

**Companion doc:** [`PLAN.md`](./PLAN.md) for roadmap, KPI formulas, and dataset profile details.

---

## 1. Purpose & Scope

Build an analytics system that turns the UAC Program's daily custody/transfer/discharge counts into **process-efficiency and outcome-stability insight**, delivered as:

1. A live Streamlit dashboard for ongoing monitoring.
2. A Word/PDF research paper (EDA, insights, recommendations) for a technical/analytical audience.
3. A slide-deck executive summary for non-technical government stakeholders.

**In scope:** descriptive process analytics (transition efficiency, backlog/bottleneck detection, temporal patterns, outcome stability) plus a lightweight, clearly-labeled trend/forecast layer.

**Out of scope (see Section 8, Non-Goals):** live data ingestion, authentication, multi-tenant access, validated predictive modeling.

### Stakeholders
- **Primary dashboard audience:** government/policy stakeholders (non-technical, need visual clarity and plain-language KPI framing).
- **Primary paper audience:** technical/analytical reviewers (methodology transparency, caveats, reproducibility).

---

## 2. Functional Requirements

Mapped directly from the brief's "Streamlit Web Application Requirements," plus the forecasting add-on agreed for this project.

### 2.1 Core Modules
| Module | Requirement |
|---|---|
| Care Pipeline Flow Visualization | Visualize the CBP custody → HHS care → discharge flow as a pipeline/flow diagram with current stocks and flow volumes |
| Transfer & Discharge Efficiency Panels | Display Transfer Efficiency Ratio and Discharge Effectiveness Index over the selected date range, as trend lines + current-value cards |
| Bottleneck Detection Charts | Visualize inflow-vs-outflow imbalance and highlight sustained backlog-accumulation windows |
| Outcome Trend Analysis | Visualize Outcome Stability Score and flag sudden drops in discharge performance |
| **Outcomes & Forecast (added)** | Show the lightweight trend projection for backlog and Discharge Effectiveness, explicitly labeled as directional/non-predictive |

### 2.2 User Capabilities
| Capability | Requirement |
|---|---|
| Date range selection | Global filter affecting all panels; must respect the dataset's actual (irregular) reporting dates, not assume daily continuity |
| Ratio-based metric toggles | User can switch which KPI(s) are plotted/emphasized on the efficiency panels |
| Threshold-based alerts (visual) | Each KPI has a configurable threshold; values crossing it are visually flagged (see Section 5) |

---

## 3. Non-Functional Requirements

- **Data source:** static CSV, read at app start and cached (`st.cache_data`) — no live feed, no external API dependency.
- **Scale:** ~720 real rows after cleaning; performance is not a real constraint at this volume — no need for a database or async loading.
- **Access model:** single-user / no-authentication, consistent with a stakeholder-review tool rather than a multi-tenant product.
- **Visual consistency:** consistent color/theme system across dashboard panels, the paper's chart exports, and the slide deck, so all three deliverables look like one system, not three disconnected outputs. Charts should hold up in both light and dark contexts where the dashboard is viewed.
- **Reproducibility:** every number shown in the dashboard, paper, or slides must trace back to the same `src/metrics.py` computation — no parallel/duplicated calculation logic per deliverable.

---

## 4. System Architecture

```
┌─────────────────────────┐
│ raw CSV                 │   HHS_Unaccompanied_Alien_Children_Program.csv
│ (data/raw/)              │
└────────────┬─────────────┘
             │
             ▼
┌─────────────────────────┐
│ src/data_loader.py       │  drop blank rows, parse dates, strip thousands
│ (Cleaning / ETL)         │  separators, compute days_since_prior_report,
│                          │  flag data-quality anomalies
└────────────┬─────────────┘
             │  → data/processed/cleaned_daily.csv
             ▼
┌─────────────────────────┐
│ src/metrics.py           │  KPI formulas, backlog accumulation,
│ (Derived Metrics)        │  outcome stability, weekday/month aggregations
└────────────┬─────────────┘
             │
      ┌──────┴──────────────────────┐
      ▼                             ▼
┌───────────────────┐   ┌─────────────────────────┐
│ src/forecasting.py │   │ Streamlit caching layer  │
│ (trend projection) │   │ (st.cache_data)          │
└─────────┬──────────┘   └────────────┬─────────────┘
          │                           ▼
          │              ┌─────────────────────────┐
          │              │ app/Home.py + pages/*    │
          │              │ (visualization + UI)     │
          │              └────────────┬─────────────┘
          │                           ▼
          │              ┌─────────────────────────┐
          │              │ Streamlit dashboard (UI) │
          │              └─────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│ reports/  — built from the SAME metrics.py    │
│ outputs as the dashboard:                     │
│   research_paper.docx  (Word/PDF)             │
│   executive_summary.pptx (slide deck)         │
└───────────────────────────────────────────────┘
```

**Key architectural principle:** `src/metrics.py` and `src/forecasting.py` are the single source of truth. The Streamlit app, the Word paper, and the slide deck are three separate *presentations* of the same computed outputs — none of them recompute KPIs independently.

---

## 5. Module Breakdown

| Module | Responsibility |
|---|---|
| `src/data_loader.py` | Load raw CSV, clean per `PLAN.md` §2 checklist, return a validated DataFrame |
| `src/metrics.py` | Compute all KPIs from §2 of `PLAN.md` (Transfer Efficiency Ratio, Discharge Effectiveness Index, Pipeline Throughput, Backlog Accumulation Rate, Outcome Stability Score) as a derived daily/rolling table |
| `src/forecasting.py` | Lightweight trend projection (moving average / linear fit) on backlog and Discharge Effectiveness; returns projected values + a "directional estimate, not validated forecast" flag for UI/paper labeling |
| `app/Home.py` | Streamlit entry point: loads data via `data_loader`, applies global date-range filter, sets shared theme/config |
| `app/pages/1_Pipeline_Flow.py` | Pipeline flow visualization (stocks + flows between CBP/HHS/discharge stages) |
| `app/pages/2_Efficiency_Panels.py` | Transfer/Discharge efficiency trend lines, KPI cards, ratio toggles |
| `app/pages/3_Bottleneck_Detection.py` | Inflow-vs-outflow imbalance chart, backlog window highlighting |
| `app/pages/4_Outcomes_and_Forecast.py` | Outcome stability chart, anomaly flags, forecast panel |
| `reports/` (generation scripts, not shown as pages) | Scripts that call `metrics.py`/`forecasting.py` output and render into `.docx`/`.pptx` |

---

## 6. Threshold / Alert Design

Each KPI gets a **default threshold**, adjustable via a sidebar control, per the brief's "threshold-based alerts" requirement:

| KPI | Default alert condition (starting point — tune after EDA) | Visual treatment |
|---|---|---|
| Transfer Efficiency Ratio | Below a low-percentile band relative to trailing history | Metric card turns amber/red; annotation marker on trend line |
| Discharge Effectiveness Index | Sustained decline over N consecutive reports | Red shading on the affected date range |
| Backlog Accumulation Rate | Positive (inflow > outflow) for a sustained window | Red-shaded backlog band on the bottleneck chart |
| Outcome Stability Score | Coefficient of variation exceeds a set band | Warning icon + tooltip explaining volatility |

Thresholds are **inputs, not hardcoded constants** — exposed in the sidebar so a stakeholder can adjust sensitivity without code changes.

---

## 7. Data Model

**Raw table** (as-loaded, before cleaning): matches the CSV verbatim, string-typed numeric/date columns.

**Cleaned table** (`data/processed/cleaned_daily.csv`):
| Column | Type |
|---|---|
| `date` | datetime |
| `days_since_prior_report` | int |
| `apprehended` | int |
| `cbp_custody` | int |
| `transferred_out_cbp` | int |
| `hhs_care` | int |
| `discharged` | int |
| `data_quality_flag` | bool/str (nullable) |

**Derived metrics table** (`metrics.py` output):
| Column | Type |
|---|---|
| `date` | datetime |
| `transfer_efficiency_ratio` | float (nullable on zero-denominator days) |
| `discharge_effectiveness_index` | float (nullable) |
| `pipeline_throughput_rate` | float (windowed) |
| `backlog_accumulation_rate` | float |
| `outcome_stability_score` | float (windowed) |
| `is_backlog_window` | bool |
| `is_weekday` | bool |
| `forecast_backlog` / `forecast_discharge_effectiveness` | float (from `forecasting.py`, forward-looking rows only) |

---

## 8. Non-Goals

- No live/streaming data ingestion or external API integration — the dataset is a static extract.
- No authentication, roles, or multi-tenant access control.
- No PII handling — all fields are already aggregate counts.
- Forecasting is **explicitly lightweight and directional** — no train/test split, no accuracy benchmarking, no claim of predictive validity. It is scoped as an analytical add-on, not a production forecasting system.

---

## 9. Risks & Assumptions

- **Irregular cadence:** the dataset does not report daily; all rate and rolling-window logic must be gap-aware (weight by `days_since_prior_report`), or efficiency/backlog metrics will be distorted around reporting gaps.
- **Undefined footnote:** the `*` on "Children apprehended and placed in CBP custody" is not defined in this extract. Its exact scope is an open assumption — state it explicitly in the research paper rather than silently treating the column as unambiguous.
- **Multi-year span, possible regime shifts:** the ~3-year range (Jan 2023–Dec 2025) may cross policy or administrative changes that shift baseline behavior independent of process efficiency — trend/forecast narratives should flag this rather than attribute all movement to pipeline performance.
- **Small-sample volatility:** some KPIs (e.g. Outcome Stability Score) are sensitive to window size on a dataset this size; window choices should be documented and justified in the paper, not left as unstated defaults.

---

## 10. Success Criteria

- All three deliverables (dashboard, paper, slide deck) are produced and reference identical KPI values for any given date range.
- Every Core Module and User Capability from the original brief (Section 2 above) is implemented and demonstrable in the running dashboard.
- Backlog/bottleneck periods and outcome-stability drops are identified with a stated, reproducible method (not just eyeballed from a chart).
- The research paper explicitly documents the data-cleaning assumptions (blank-row truncation, comma parsing, footnote ambiguity, irregular cadence) so findings are auditable by a reviewer who did not build the pipeline.
