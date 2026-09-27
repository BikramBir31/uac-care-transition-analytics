# Project Plan — Care Transition Efficiency & Placement Outcome Analytics

**Program:** HHS Unaccompanied Alien Children (UAC) Program
**Sponsor context:** Unified Mentor / U.S. Department of Health and Human Services (internship brief)
**Companion doc:** [`PRD_ARCHITECTURE.md`](./PRD_ARCHITECTURE.md) for functional requirements and system design.

---

## 1. Background

The UAC Program is a multi-stage custody-to-reunification pipeline:

`Apprehension & CBP custody → Transfer to HHS care → Medical screening, sheltering, case management → Discharge & reunification with a vetted sponsor`

Aggregate headcounts (how many children are "in the system" today) are already visible. What's missing is **process efficiency**: how fast children move through each stage, whether discharges keep pace with intake, and where backlogs form. This project reframes the raw daily counts as a flow/throughput problem rather than a capacity snapshot.

### Objectives
- Measure efficiency of CBP → HHS transitions
- Evaluate discharge and sponsor-placement outcomes
- Identify delays and process bottlenecks

### Secondary objectives
- Support faster reunification
- Improve case management workflows
- Inform policy-level process reforms

---

## 2. Dataset Profile

Source file: `HHS_Unaccompanied_Alien_Children_Program.csv` (project root).

| Column | Description |
|---|---|
| `Date` | Reporting date |
| `Children apprehended and placed in CBP custody*` | Daily intake volume (footnoted — see caveat below) |
| `Children in CBP custody` | Active CBP care load (stock) |
| `Children transferred out of CBP custody` | Flow into HHS system |
| `Children in HHS Care` | Active HHS care load (stock) |
| `Children discharged from HHS Care` | Successful sponsor placements |

**Actual profile (verified by inspection, not assumed from the brief):**
- **719 real data rows**, spanning **January 12, 2023 → December 21, 2025**.
- The raw file has **~450 fully-blank trailing rows** after the real data — must be dropped during load, not treated as missing data points.
- Numeric columns are stored as quoted strings with thousands separators, e.g. `"2,484"` — requires comma-stripping before numeric cast.
- `Date` is a string like `"December 21, 2025"` — requires `pd.to_datetime`.
- **Reporting cadence is irregular**, not daily. Gaps of several days are common (e.g. `Jan 12 → Jan 22, 2023`), and it's not a clean "weekdays only" pattern either. This matters for:
  - Weekday-vs-weekend comparisons (can't assume every weekday is present)
  - Any day-over-day delta or rate calculation (must use actual elapsed days between rows, not assume 1)
- The apprehension column header carries a trailing `*` footnote marker whose definition is not included in this file — treat its exact scope/definition as an **open assumption** to caveat in the paper, not to silently strip and ignore.
- No PII — all fields are aggregate daily counts.

### Data cleaning checklist (Phase 1)
1. Load CSV, drop rows that are entirely blank.
2. Strip thousands-separator commas from numeric columns; cast to `int`.
3. Parse `Date` to datetime; sort ascending.
4. Compute `days_since_prior_report` per row (for gap-aware rate calculations).
5. Sanity-check: flag any row with negative implied stock change or a discharge/transfer count exceeding the prior stock (data-quality flag, not auto-corrected).
6. Persist a cleaned table (e.g. `data/processed/cleaned_daily.csv`) as the single source of truth for every downstream deliverable.

---

## 3. Analytical Methodology

### 3.1 Care Pipeline Modeling
- Model the system as a two-stage flow pipeline: **CBP custody → HHS care → Sponsor placement**.
- Track daily stocks (`in custody`, `in care`) and flows (`transferred`, `discharged`) between stages.

### 3.2 Transition Efficiency Metrics (KPIs)

| KPI | Formula | Edge case handling |
|---|---|---|
| **Transfer Efficiency Ratio** | `Transfers ÷ CBP Custody` | Undefined when CBP custody = 0 for that day → exclude from ratio, don't divide by zero |
| **Discharge Effectiveness Index** | `Discharges ÷ HHS Care` | Same zero-denominator handling |
| **Pipeline Throughput Rate** | `Total exits ÷ Total entries` (windowed, e.g. rolling 7/30-report window given irregular cadence) | Requires a defined window since cadence isn't daily |
| **Backlog Accumulation Rate** | Rolling sum of `(inflow − outflow)` over a sustained window; flag windows where the imbalance stays positive/negative beyond a threshold | Use `days_since_prior_report`-weighted sums, not raw row counts |
| **Outcome Stability Score** | Rolling coefficient of variation (std ÷ mean) of Discharge Effectiveness Index over a trailing window | Requires minimum window size to avoid noise on short windows |

### 3.3 Backlog & Delay Identification
- Compare inflow (apprehensions + transfers in) vs. successful exits (discharges) over time.
- Identify sustained-imbalance periods (consecutive windows where exits < entries).
- Surface periods of case accumulation (rising `Children in HHS Care` stock without proportional discharge growth).

### 3.4 Temporal & Pattern Analysis
- Weekday vs. weekend transition speed (accounting for missing-day gaps — compare only days that are actually present, not assume full calendar coverage).
- Month-over-month placement trends.
- Identification of prolonged stagnation periods (multi-week stretches with flat/declining Discharge Effectiveness).

### 3.5 Outcome Stability Analysis
- Variability in discharge performance over time (Outcome Stability Score above).
- Sudden drops in reunification success (z-score or rolling-window outlier detection on Discharge Effectiveness Index).

### 3.6 Lightweight Forecasting (added scope, beyond the original brief)
- Simple moving-average and linear-trend projection (e.g. `statsmodels` OLS or `numpy.polyfit`) applied to:
  - Backlog trajectory (is the imbalance widening or closing?)
  - Discharge Effectiveness Index (short-horizon directional trend)
- Explicitly labeled in all outputs as a **directional trend estimate**, not a validated predictive model — no claim of forecast accuracy, no train/test benchmarking required for this scope.

---

## 4. Repository Structure (proposed)

```
intern_proj/
├── data/
│   ├── raw/                  # original CSV, untouched
│   └── processed/            # cleaned_daily.csv, derived metrics table
├── src/
│   ├── data_loader.py        # load + clean (Section 2 checklist)
│   ├── metrics.py            # KPI, backlog, stability calculations
│   └── forecasting.py        # lightweight trend projection
├── app/
│   ├── Home.py                # Streamlit entry point
│   └── pages/
│       ├── 1_Pipeline_Flow.py
│       ├── 2_Efficiency_Panels.py
│       ├── 3_Bottleneck_Detection.py
│       └── 4_Outcomes_and_Forecast.py
├── notebooks/                 # exploratory analysis only, not a deliverable
├── reports/
│   ├── analysis.py             # computes analysis_summary.json + figures/*.png from src/
│   ├── analysis_summary.json   # every number cited in the paper/slides, generated not hand-typed
│   ├── figures/                # chart PNGs embedded in the paper
│   ├── build_paper.js          # docx-js -> research_paper.docx (+ .pdf via LibreOffice)
│   ├── build_slides.js         # pptxgenjs -> executive_summary.pptx (+ .pdf)
│   ├── package.json            # Node deps for the two build scripts (docx, pptxgenjs)
│   ├── research_paper.docx / .pdf
│   └── executive_summary.pptx / .pdf
├── requirements.txt
├── PLAN.md
└── PRD_ARCHITECTURE.md
```

---

## 5. Tech Stack

- **Language:** Python 3.11+ (analysis/dashboard), Node.js (report generation)
- **Data processing:** pandas
- **Visualization:** Plotly (dashboard), Matplotlib (static report charts)
- **App framework:** Streamlit (multipage app)
- **Forecasting:** numpy (simple linear trend only)
- **Research paper:** `docx` (docx-js, Node) — final format: **Word (.docx) + PDF export**
- **Executive summary:** `pptxgenjs` (Node) — final format: **slide deck (.pptx) + PDF export**

---

## 6. Roadmap / Phases

| Phase | Deliverable | Depends on |
|---|---|---|
| 1. Data cleaning & validation | `src/data_loader.py`, `data/processed/cleaned_daily.csv` | Dataset profile (Section 2) |
| 2. Metric engineering | `src/metrics.py`, derived metrics table | Phase 1 |
| 3. EDA & bottleneck/backlog detection | Analysis notebook, charts | Phase 2 |
| 4. Lightweight forecasting add-on | `src/forecasting.py` | Phase 2 |
| 5. Streamlit dashboard | `app/Home.py` + pages | Phases 2–4 |
| 6. Research paper (Word/PDF) | `reports/research_paper.docx` | Phases 3–4 |
| 7. Executive summary (slide deck) | `reports/executive_summary.pptx` | Phase 6 |

All three deliverables (dashboard, paper, slides) read from the **same** `src/metrics.py` outputs so numbers never diverge between them.

---

## 7. Deliverables Checklist

- [x] Research paper — EDA, insights, and recommendations (`reports/research_paper.docx` / `.pdf`)
- [x] Streamlit dashboard — live analytics app (`app/Home.py`)
- [x] Executive summary — slide deck for government stakeholders (`reports/executive_summary.pptx` / `.pdf`)

---

## 8. Environment Setup

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
streamlit run app/Home.py
```

`requirements.txt` (initial): `pandas`, `plotly`, `streamlit`, `numpy`, `statsmodels`, `python-docx`, `python-pptx`.

---

## 9. Known Risks & Assumptions

- Irregular reporting cadence means naive per-row rate math will be misleading; all rate/window calculations must be gap-aware (see Section 2).
- The `*` footnote on the apprehension column is undefined in this extract — its exact definition is an open assumption to state explicitly in the research paper.
- The dataset spans ~3 years, which likely crosses policy/administration changes — trend and forecast interpretations should note this as a potential confound, not attribute all trend shifts to process efficiency alone.
