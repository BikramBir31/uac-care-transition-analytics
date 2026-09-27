const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType,
  ImageRun, PageBreak, LevelFormat,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");
const FIG = path.join(__dirname, "figures");
const S = JSON.parse(fs.readFileSync(path.join(__dirname, "analysis_summary.json"), "utf8"));

const INK = "0B0B0B";
const INK2 = "52514E";
const BLUE = "2A78D6";
const ORANGE = "EB6834";
const RED = "E34948";
const GRID = "E1E0D9";

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const num = (x) => Math.round(x).toLocaleString("en-US");
const ratio = (x) => x.toFixed(4);
const yr = (y, k) => S.yearly[y][k];

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 } });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } });
}
function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, color: INK, size: 22 })],
    spacing: { after: 200, line: 300 },
    ...opts,
  });
}
function caption(text) {
  return new Paragraph({
    children: [new TextRun({ text, italics: true, color: INK2, size: 18 })],
    spacing: { after: 280 },
    alignment: AlignmentType.CENTER,
  });
}
function warningBody(text) {
  return new Paragraph({
    children: [new TextRun({ text, italics: true, color: RED, size: 20 })],
    spacing: { after: 200, line: 280 },
  });
}
function contentsEntry(text, indent) {
  return new Paragraph({
    children: [new TextRun({ text, color: indent ? INK2 : INK, size: indent ? 20 : 22, bold: !indent })],
    spacing: { after: indent ? 60 : 100 },
    indent: indent ? { left: 400 } : undefined,
  });
}
function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text, color: INK, size: 22 })],
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 100, line: 280 },
  });
}
function figure(fileName, widthIn, heightIn, captionText) {
  const data = fs.readFileSync(path.join(FIG, fileName));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [
        new ImageRun({
          type: "png",
          data,
          transformation: { width: widthIn * 96, height: heightIn * 96 },
        }),
      ],
    }),
    caption(captionText),
  ];
}

function kpiTable() {
  const rows = [
    ["KPI", "Formula", "Latest value (Dec 21, 2025)"],
    ["Transfer Efficiency Ratio", "Transfers ÷ CBP Custody", ratio(S.latest.transfer_efficiency_ratio)],
    ["Discharge Effectiveness Index", "Discharges ÷ HHS Care", ratio(S.latest.discharge_effectiveness_index)],
    ["Pipeline Throughput Rate", "Total exits ÷ total entries (30-day rolling)", "see Figure 2"],
    ["Backlog Accumulation Rate", "14-day rolling (transfers in − discharges)", `${num(S.backlog.peak_value)} (peak, ${S.backlog.peak_date})`],
    ["Outcome Stability Score", "30-day rolling coefficient of variation of discharge effectiveness", ratio(S.stability.avg_score) + " (avg)"],
  ];
  const widths = [3200, 4200, 2400];
  return new Table({
    width: { size: 9800, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, i) =>
      new TableRow({
        children: r.map((cellText, ci) =>
          new TableCell({
            width: { size: widths[ci], type: WidthType.DXA },
            shading: i === 0 ? { type: ShadingType.CLEAR, fill: "1E2761" } : undefined,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cellText,
                    bold: i === 0,
                    color: i === 0 ? "FFFFFF" : INK,
                    size: 20,
                  }),
                ],
              }),
            ],
          })
        ),
      })
    ),
  });
}

function yearlyTable() {
  const years = ["2023", "2024", "2025"];
  const header = ["Metric", ...years];
  const rowsDef = [
    ["Reports", (y) => yr(y, "reports")],
    ["Avg. Transfer Efficiency Ratio", (y) => ratio(yr(y, "avg_transfer_efficiency"))],
    ["Avg. Discharge Effectiveness Index", (y) => ratio(yr(y, "avg_discharge_effectiveness"))],
    ["Avg. HHS Care population", (y) => num(yr(y, "avg_hhs_care"))],
    ["Avg. CBP custody population", (y) => num(yr(y, "avg_cbp_custody"))],
    ["Total discharged (year)", (y) => num(yr(y, "total_discharged"))],
  ];
  const widths = [3600, 2200, 2200, 2200];
  const rows = [header, ...rowsDef.map(([label, fn]) => [label, ...years.map((y) => String(fn(y)))])];
  return new Table({
    width: { size: 10200, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, i) =>
      new TableRow({
        children: r.map((cellText, ci) =>
          new TableCell({
            width: { size: widths[ci], type: WidthType.DXA },
            shading: i === 0 ? { type: ShadingType.CLEAR, fill: "1E2761" } : undefined,
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: cellText, bold: i === 0, color: i === 0 ? "FFFFFF" : INK, size: 20 }),
                ],
              }),
            ],
          })
        ),
      })
    ),
  });
}

const doc = new Document({
  styles: {
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { color: "1E2761", bold: true, size: 30, font: "Cambria" },
        paragraph: { spacing: { before: 360, after: 160 } },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { color: "2A4494", bold: true, size: 24, font: "Cambria" },
        paragraph: { spacing: { before: 280, after: 120 } },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 260 } } } }],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children: [
        new Paragraph({ text: "", spacing: { before: 1600 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Care Transition Efficiency &", bold: true, size: 44, color: "1E2761" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "Placement Outcome Analytics", bold: true, size: 44, color: "1E2761" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: "A Process-Efficiency Analysis of the HHS Unaccompanied Alien Children Program", size: 26, color: INK2, italics: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 800, after: 60 },
          children: [new TextRun({ text: `Reporting period: ${S.date_range.start} – ${S.date_range.end}`, size: 22, color: INK2 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: `${S.report_count} daily reports analyzed`, size: 22, color: INK2 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Prepared for: HHS / Unified Mentor Internship Program", size: 22, color: INK2 })],
        }),
        new Paragraph({ children: [new PageBreak()] }),

        h1("Contents"),
        contentsEntry("1. Executive Summary"),
        contentsEntry("2. Background & Problem Statement"),
        contentsEntry("2.1 Objectives", true),
        contentsEntry("3. Data & Methodology"),
        contentsEntry("3.1 Dataset", true),
        contentsEntry("3.2 Cleaning & Caveats", true),
        contentsEntry("3.3 Key Performance Indicators", true),
        contentsEntry("4. Findings"),
        contentsEntry("4.1 Population & Flow Trends", true),
        contentsEntry("4.2 Transfer & Discharge Efficiency", true),
        contentsEntry("4.3 Backlog & Bottleneck Detection", true),
        contentsEntry("4.4 Temporal Patterns", true),
        contentsEntry("4.5 Outcome Stability", true),
        contentsEntry("5. Discussion"),
        contentsEntry("6. Lightweight Forecast"),
        contentsEntry("7. Recommendations"),
        contentsEntry("8. Limitations"),
        contentsEntry("Appendix A. KPI Reference"),
        new Paragraph({ children: [new PageBreak()] }),

        h1("1. Executive Summary"),
        body(
          `This report analyzes ${S.report_count} daily operational reports from the HHS Unaccompanied Alien Children (UAC) Program, spanning ${S.date_range.start} to ${S.date_range.end}, to evaluate process efficiency rather than raw headcounts. Over the reporting period the active HHS care population fell from an average of ${num(yr("2023", "avg_hhs_care"))} children in 2023 to ${num(yr("2025", "avg_hhs_care"))} in 2025.`
        ),
        body(
          `That decline is not explained by improved discharge throughput: the Discharge Effectiveness Index — discharges as a share of the active care population — fell from an average of ${ratio(yr("2023", "avg_discharge_effectiveness"))} in 2023 to ${ratio(yr("2025", "avg_discharge_effectiveness"))} in 2025, and continued declining through the second half of 2025. The data instead point to a sharp reduction in new arrivals into HHS care as the primary driver of the smaller population, meaning the underlying placement process has become less efficient even as the system looks less strained on paper.`
        ),
        body(
          `${S.backlog.windows_flagged} of ${S.report_count} reports (${pct(S.backlog.share_of_reports)}) fall inside a sustained backlog-accumulation window, including a ${S.backlog.longest_streak_reports}-report stretch from ${S.backlog.longest_streak_start} to ${S.backlog.longest_streak_end}. A lightweight trend projection (Section 6) suggests both signals — backlog accumulation and discharge effectiveness — are pointed in the wrong direction heading into 2026, which we flag as the report's central actionable finding.`
        ),

        h1("2. Background & Problem Statement"),
        body(
          "The UAC Program operates a multi-stage custody-to-reunification pipeline: apprehension and CBP custody, transfer to HHS care, medical screening and case management, and discharge to a vetted sponsor. Aggregate headcounts of children in custody are routinely monitored, but process efficiency — how fast children move through each stage, whether discharges keep pace with intake, and where backlogs form — is not. This analysis reframes the program's daily counts as a flow and throughput problem to surface that missing view."
        ),
        h2("2.1 Objectives"),
        bullet("Measure the efficiency of CBP → HHS transitions."),
        bullet("Evaluate discharge and sponsor-placement outcomes."),
        bullet("Identify delays and process bottlenecks."),
        bullet("Support faster reunification, improved case management, and policy-level process reform."),

        h1("3. Data & Methodology"),
        h2("3.1 Dataset"),
        body(
          `The source dataset (HHS_Unaccompanied_Alien_Children_Program.csv) contains ${S.report_count} valid daily reports after cleaning, covering ${S.date_range.start} through ${S.date_range.end}. Six fields are reported per date: children apprehended and placed in CBP custody, children in CBP custody, children transferred out of CBP custody, children in HHS care, and children discharged from HHS care.`
        ),
        h2("3.2 Cleaning & Caveats"),
        bullet("The raw export contained ~450 fully blank trailing rows, dropped before analysis."),
        bullet("Numeric fields used thousands-separator commas inside quoted strings (e.g. “2,484”) and were parsed to integers."),
        bullet(
          `Reporting cadence is irregular, not daily — gaps of several days between reports are common. All rate and rolling-window metrics in this report use time-based windows (e.g. a 14-day rolling sum) rather than row counts, so they remain valid across reporting gaps.`
        ),
        bullet(S.data_quality.apprehension_footnote_caveat),
        bullet(
          `Automated anomaly checks (negative values; discharges exceeding the prior HHS-care stock) flagged ${S.data_quality.anomalies_flagged} of ${S.report_count} reports — the dataset shows no gross data-entry errors of that kind.`
        ),
        h2("3.3 Key Performance Indicators"),
        body("The following KPIs were computed for every report and form the basis of Sections 4–6:"),
        kpiTable(),
        new Paragraph({ text: "", spacing: { after: 240 } }),

        h1("4. Findings"),
        h2("4.1 Population & Flow Trends"),
        body(
          `Figure 1 shows the active CBP custody and HHS care populations across the full reporting window. HHS care held between roughly 6,000 and 11,500 children through 2023–2024, then fell sharply beginning in February–March 2025 to a floor near 2,000–2,500 — where it has remained through the end of the reporting period.`
        ),
        ...figure("01_stocks_over_time.png", 6.2, 2.7, "Figure 1. Active custody and care stocks, Jan 2023–Dec 2025."),
        body("Table 1 summarizes the year-over-year shift:"),
        yearlyTable(),
        new Paragraph({ text: "", spacing: { after: 240 } }),

        h2("4.2 Transfer & Discharge Efficiency"),
        body(
          `Both efficiency ratios declined over the reporting period. The average Transfer Efficiency Ratio fell from ${ratio(yr("2023", "avg_transfer_efficiency"))} (2023) to ${ratio(yr("2025", "avg_transfer_efficiency"))} (2025); the average Discharge Effectiveness Index fell from ${ratio(yr("2023", "avg_discharge_effectiveness"))} to ${ratio(yr("2025", "avg_discharge_effectiveness"))} over the same span (Figures 2a–2b, shown on separate scales — the two ratios differ by roughly two orders of magnitude). The 2025 decline is not gradual — Figure 5 (Section 4.4) shows it concentrated from March 2025 onward.`
        ),
        ...figure("02a_transfer_efficiency.png", 6.2, 2.7, "Figure 2a. Transfer Efficiency Ratio, daily."),
        ...figure("02b_discharge_effectiveness.png", 6.2, 2.7, "Figure 2b. Discharge Effectiveness Index, daily."),

        h2("4.3 Backlog & Bottleneck Detection"),
        body(
          `${pct(S.backlog.share_of_reports)} of all reports (${S.backlog.windows_flagged} of ${S.report_count}) fall within a 14-day window where transfers into HHS care outpaced discharges — an active backlog-accumulation period. The longest sustained streak ran ${S.backlog.longest_streak_reports} consecutive reports, from ${S.backlog.longest_streak_start} to ${S.backlog.longest_streak_end}. The single largest 14-day net inflow was ${num(S.backlog.peak_value)} children, recorded on ${S.backlog.peak_date}.`
        ),
        ...figure("03_backlog.png", 6.2, 2.7, "Figure 3. 14-day rolling backlog accumulation rate (red = building, blue = clearing)."),
        body(
          `Figure 3 clarifies the population story in Figure 1: 2023 and most of 2024 were dominated by sustained backlog-clearing (net outflow), which is consistent with the declining HHS-care population across that period. But the shift toward the 2025 floor coincides with backlog-building episodes in mid-to-late 2024, not with an efficiency gain — reinforcing that the smaller 2025 population reflects reduced intake rather than a faster, more effective discharge process. Over the most recent 30 days in the dataset, the rolling backlog rate averaged ${S.backlog.recent_30d_avg.toFixed(1)} children versus ${S.backlog.prior_30d_avg.toFixed(1)} in the preceding 30 days — a move toward net inflow that merits monitoring (see Section 6).`
        ),

        h2("4.4 Temporal Patterns"),
        body(
          `Weekday reports averaged a Discharge Effectiveness Index of ${ratio(S.weekday_vs_weekend.weekday_avg_discharge_effectiveness)} versus ${ratio(S.weekday_vs_weekend.weekend_avg_discharge_effectiveness)} on weekend reports — a modest but consistent gap in the weekend's favor. Given the small magnitude, we treat this as descriptive rather than a strong operational signal, and note it warrants a staffing-pattern review rather than a conclusion on its own.`
        ),
        body(
          `Month-over-month, Discharge Effectiveness held in a narrow 0.025–0.036 band from January 2023 through February 2025, then dropped to a 0.004–0.008 band from March 2025 onward and has trended ${S.monthly_trend_direction_last_6mo} over the most recent six months of data (Figure 5).`
        ),
        ...figure("05_monthly_trend.png", 6.2, 2.7, "Figure 5. Month-over-month average Discharge Effectiveness Index."),

        h2("4.5 Outcome Stability"),
        body(
          `The Outcome Stability Score (30-day rolling coefficient of variation of Discharge Effectiveness) averaged ${ratio(S.stability.avg_score)} across the reporting period (median ${ratio(S.stability.median_score)}). ${S.stability.high_volatility_reports} reports (${pct(S.stability.high_volatility_reports / S.report_count)}) exceeded a volatility threshold of ${S.stability.high_volatility_threshold}, indicating stretches where discharge performance was materially less predictable than average.`
        ),
        ...figure("04_outcome_stability.png", 6.2, 2.7, "Figure 4. Outcome Stability Score with volatility threshold."),

        h1("5. Discussion"),
        body(
          `Read together, Sections 4.1–4.4 tell a consistent story: the UAC pipeline looks healthier in 2025 by raw headcount — far fewer children in care — but process efficiency has not improved and, by the Discharge Effectiveness Index, has materially worsened. The population decline is better explained by a collapse in new arrivals/transfers than by a more effective discharge process.`
        ),
        body(
          `The ~3-year reporting window (2023–2025) likely crosses policy or administrative changes that this dataset cannot, by itself, attribute causally. We do not draw a causal conclusion here; we flag the coincidence in timing (the shift begins around February–March 2025) as a hypothesis for HHS analysts with program-level context to investigate, not as a finding this report can confirm.`
        ),

        h1("6. Lightweight Forecast"),
        warningBody(S.forecast.caveat),
        body(
          `Extending the trailing 60-day trend forward 14 days: Backlog Accumulation Rate is projected to move from ${S.forecast.backlog_accumulation_rate.last_actual.toFixed(1)} to ${S.forecast.backlog_accumulation_rate.projected.toFixed(1)} (${S.forecast.backlog_accumulation_rate.direction}), and Discharge Effectiveness Index from ${ratio(S.forecast.discharge_effectiveness_index.last_actual)} to ${ratio(S.forecast.discharge_effectiveness_index.projected)} (${S.forecast.discharge_effectiveness_index.direction}). Both directional signals point the same way: toward a re-accumulating backlog and continued weak discharge effectiveness. This is a simple linear projection, not a validated model — its value is as an early-warning signal to monitor, not a prediction to plan around.`
        ),
        ...figure("06_forecast_backlog.png", 6.2, 2.7, "Figure 6. Backlog Accumulation Rate, trailing 60 days with directional projection."),

        h1("7. Recommendations"),
        bullet("Investigate the root cause of the Discharge Effectiveness decline separately from the population decline — e.g. sponsor-vetting delays, staffing levels, or case-management capacity — since the two are not the same signal and current reporting conflates them."),
        bullet("Stand up automated monitoring on the Backlog Accumulation Rate turning positive for 2+ consecutive weeks, given the recent shift back toward net inflow identified in Section 4.3."),
        bullet("Confirm the exact definition of the footnoted “Children apprehended and placed in CBP custody” metric with HHS before it is used in external reporting."),
        bullet("Review weekday/weekend staffing patterns given the modest but consistent discharge-effectiveness gap identified in Section 4.4."),
        bullet("Standardize reporting cadence (or explicitly document gap-handling) to improve the precision of future rate-based KPIs."),

        h1("8. Limitations"),
        bullet("This is a descriptive analysis of program-level counts; it cannot establish causality for the trends it identifies."),
        bullet("The forecast in Section 6 is a directional linear trend over 60 days, not a validated predictive model."),
        bullet("Irregular reporting cadence limits the precision of any single-day rate calculation, though all rolling metrics are time-window-based to mitigate this."),
        bullet("The apprehension-column footnote is undefined in this extract (Section 3.2)."),

        h1("Appendix A. KPI Reference"),
        kpiTable(),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const out = path.join(ROOT, "reports", "research_paper.docx");
  fs.writeFileSync(out, buffer);
  console.log("Wrote", out);
});
