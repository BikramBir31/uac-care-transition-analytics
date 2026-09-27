const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

const ROOT = path.resolve(__dirname, "..");
const S = JSON.parse(fs.readFileSync(path.join(__dirname, "analysis_summary.json"), "utf8"));

// Palette: "Midnight Executive" chrome + dataviz-reference data-series colors.
const NAVY = "1E2761";
const NAVY_DARK = "141A45";
const ICE = "CADCFC";
const WHITE = "FFFFFF";
const INK = "1A1A1A";
const INK2 = "52514E";
const MUTED = "8A8FB8";
const BLUE = "2A78D6";
const ORANGE = "EB6834";
const RED = "E34948";
const GRID = "E1E0D9";

const FONT_HEAD = "Cambria";
const FONT_BODY = "Calibri";

const num = (x) => Math.round(x).toLocaleString("en-US");
const ratio = (x) => x.toFixed(4);
const pct1 = (x) => `${(x * 100).toFixed(1)}%`;
const yr = (y, k) => S.yearly[y][k];
const monthLabels = Object.keys(S.monthly_discharge_effectiveness);
const monthValues = Object.values(S.monthly_discharge_effectiveness);

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
const PAGE_W = 13.33;
const PAGE_H = 7.5;

function darkBg(slide) {
  slide.background = { color: NAVY };
}
function lightBg(slide) {
  slide.background = { color: WHITE };
}

function footer(slide, label, dark) {
  slide.addText(label, {
    x: 0.5, y: PAGE_H - 0.45, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, color: dark ? MUTED : INK2,
    isTextBox: true, margin: 0,
  });
  slide.addText("Care Transition Efficiency & Placement Outcome Analytics", {
    x: PAGE_W - 6.5, y: PAGE_H - 0.45, w: 6, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, color: dark ? MUTED : INK2, align: "right",
    isTextBox: true, margin: 0,
  });
}

function statCircle(slide, x, y, d, value, label, opts = {}) {
  const fill = opts.fill || NAVY;
  const valueColor = opts.valueColor || WHITE;
  slide.addShape("ellipse", { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" } });
  slide.addText(value, {
    x, y, w: d, h: d,
    align: "center", valign: "middle", isTextBox: true, margin: 0,
    fontFace: FONT_HEAD, fontSize: opts.valueSize || 30, bold: true, color: valueColor,
  });
  slide.addText(label, {
    x: x - d * 0.15, y: y + d + 0.18, w: d * 1.3, h: 0.75,
    align: "center", valign: "top", isTextBox: true, margin: 0,
    fontFace: FONT_BODY, fontSize: 12, color: opts.labelColor || INK2,
  });
}

// ---------------------------------------------------------------- Slide 1
{
  const s = pres.addSlide();
  darkBg(s);
  s.addText("CARE TRANSITION EFFICIENCY &\nPLACEMENT OUTCOME ANALYTICS", {
    x: 0.9, y: 2.3, w: 11.5, h: 1.9, isTextBox: true, margin: 0,
    fontFace: FONT_HEAD, fontSize: 40, bold: true, color: WHITE, align: "left", lineSpacingMultiple: 1.08,
  });
  s.addText("A process-efficiency analysis of the HHS Unaccompanied Alien Children Program", {
    x: 0.9, y: 4.05, w: 10.5, h: 0.6, isTextBox: true, margin: 0,
    fontFace: FONT_BODY, fontSize: 18, italic: true, color: ICE,
  });
  s.addText(`${S.date_range.start} – ${S.date_range.end}   |   ${S.report_count} daily reports analyzed`, {
    x: 0.9, y: 5.9, w: 10.5, h: 0.4, isTextBox: true, margin: 0,
    fontFace: FONT_BODY, fontSize: 14, color: MUTED,
  });
  s.addText("Prepared for HHS / Unified Mentor Internship Program", {
    x: 0.9, y: 6.35, w: 10.5, h: 0.4, isTextBox: true, margin: 0,
    fontFace: FONT_BODY, fontSize: 14, color: MUTED,
  });
}

// ---------------------------------------------------------------- Slide 2: Executive summary stats
{
  const s = pres.addSlide();
  lightBg(s);
  s.addText("The Program Looks Smaller — Not More Efficient", {
    x: 0.6, y: 0.5, w: 12.1, h: 0.7, isTextBox: true, margin: 0,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: NAVY,
  });
  s.addText("Three numbers from the reporting period", {
    x: 0.6, y: 1.15, w: 12.1, h: 0.4, isTextBox: true, margin: 0,
    fontFace: FONT_BODY, fontSize: 15, italic: true, color: INK2,
  });

  const y = 2.0, d = 2.3;
  statCircle(s, 0.9, y, d, `${num(yr("2023", "avg_hhs_care"))} → ${num(yr("2025", "avg_hhs_care"))}`, "Avg. children in HHS care, 2023 vs 2025", { fill: NAVY, valueSize: 20 });
  statCircle(s, 4.9, y, d, `${ratio(yr("2023", "avg_discharge_effectiveness"))} → ${ratio(yr("2025", "avg_discharge_effectiveness"))}`, "Avg. Discharge Effectiveness Index, 2023 vs 2025", { fill: RED, valueSize: 18 });
  statCircle(s, 8.9, y, d, pct1(S.backlog.share_of_reports), `of all reports fall inside an active backlog-accumulation window`, { fill: ORANGE, valueSize: 28 });

  s.addText(
    "The active care population fell by more than 70% — but discharge effectiveness fell too. The decline reflects fewer new arrivals, not a faster reunification pipeline.",
    {
      x: 0.9, y: 5.75, w: 11.5, h: 1.0, isTextBox: true, margin: 0,
      fontFace: FONT_BODY, fontSize: 16, color: INK, align: "left",
    }
  );
  footer(s, "Section 1 — Executive Summary");
}

// ---------------------------------------------------------------- Slide 3: Pipeline overview (shape diagram)
{
  const s = pres.addSlide();
  lightBg(s);
  s.addText("The Care Pipeline", {
    x: 0.6, y: 0.5, w: 12.1, h: 0.7, isTextBox: true, margin: 0,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: NAVY,
  });
  const stages = [
    { label: "Apprehension &\nCBP Custody", color: NAVY },
    { label: "Transfer to\nHHS Care", color: BLUE },
    { label: "Screening &\nCase Management", color: "5B6BAE" },
    { label: "Discharge to\nSponsor", color: ORANGE },
  ];
  const boxW = 2.6, boxH = 1.5, gap = 0.55, startX = 0.9, y = 3.1;
  stages.forEach((st, i) => {
    const x = startX + i * (boxW + gap);
    s.addShape("roundRect", {
      x, y, w: boxW, h: boxH, rectRadius: 0.12,
      fill: { color: st.color }, line: { type: "none" },
      shadow: { type: "outer", color: "000000", opacity: 0.25, blur: 6, offset: 3, angle: 90 },
    });
    s.addText(st.label, {
      x, y, w: boxW, h: boxH, align: "center", valign: "middle", isTextBox: true, margin: 0,
      fontFace: FONT_BODY, fontSize: 14, bold: true, color: WHITE,
    });
    if (i < stages.length - 1) {
      s.addShape("rightArrow", {
        x: x + boxW + 0.05, y: y + boxH / 2 - 0.15, w: gap - 0.1, h: 0.3,
        fill: { color: GRID }, line: { type: "none" },
      });
    }
  });
  s.addText(
    "This report measures the speed and reliability of movement between stages — not just how many children occupy each one at a point in time.",
    {
      x: 0.9, y: 5.2, w: 11.5, h: 0.9, isTextBox: true, margin: 0,
      fontFace: FONT_BODY, fontSize: 16, color: INK2,
    }
  );
  footer(s, "Section 2 — Background");
}

// ---------------------------------------------------------------- Slide 4: Population trend (native chart)
{
  const s = pres.addSlide();
  lightBg(s);
  s.addText("Active Population Fell Sharply in Early 2025", {
    x: 0.6, y: 0.5, w: 12.1, h: 0.7, isTextBox: true, margin: 0,
    fontFace: FONT_HEAD, fontSize: 28, bold: true, color: NAVY,
  });
  s.addChart(
    pres.ChartType.bar,
    [
      {
        name: "Avg. HHS Care Population",
        labels: ["2023", "2024", "2025"],
        values: [yr("2023", "avg_hhs_care"), yr("2024", "avg_hhs_care"), yr("2025", "avg_hhs_care")],
      },
    ],
    {
      x: 0.8, y: 1.5, w: 7.6, h: 5.2,
      chartColors: [NAVY],
      showTitle: true, title: "Average HHS Care Population by Year", titleFontFace: FONT_BODY, titleFontSize: 14,
      showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 12, dataLabelColor: INK,
      catAxisLabelColor: INK2, valAxisLabelColor: INK2, catAxisLabelFontSize: 12, valAxisLabelFontSize: 11,
      valGridLine: { color: GRID, size: 1 }, catGridLine: { style: "none" },
      showLegend: false,
      barGapWidthPct: 40,
    }
  );
  s.addText([
    { text: `${num(yr("2023", "avg_hhs_care"))}`, options: { fontSize: 26, bold: true, color: NAVY, breakLine: true } },
    { text: "average children in HHS care, 2023", options: { fontSize: 13, color: INK2, breakLine: true, paraSpaceAfter: 18 } },
    { text: `${num(yr("2025", "avg_hhs_care"))}`, options: { fontSize: 26, bold: true, color: RED, breakLine: true } },
    { text: "average children in HHS care, 2025", options: { fontSize: 13, color: INK2, breakLine: true, paraSpaceAfter: 18 } },
    { text: `−${pct1(1 - yr("2025", "avg_hhs_care") / yr("2023", "avg_hhs_care"))}`, options: { fontSize: 26, bold: true, color: ORANGE, breakLine: true } },
    { text: "year-over-year change", options: { fontSize: 13, color: INK2 } },
  ], { x: 8.7, y: 1.7, w: 4.0, h: 4.8, isTextBox: true, margin: 0, fontFace: FONT_BODY, valign: "top" });
  footer(s, "Section 4.1 — Population & Flow Trends");
}

// ---------------------------------------------------------------- Slide 5: Efficiency decline
{
  const s = pres.addSlide();
  lightBg(s);
  s.addText("Discharge Effectiveness Has Not Kept Pace", {
    x: 0.6, y: 0.5, w: 12.1, h: 0.7, isTextBox: true, margin: 0,
    fontFace: FONT_HEAD, fontSize: 28, bold: true, color: NAVY,
  });
  s.addChart(
    pres.ChartType.line,
    [
      { name: "Discharge Effectiveness Index", labels: monthLabels, values: monthValues },
    ],
    {
      x: 0.8, y: 1.4, w: 11.7, h: 5.3,
      chartColors: [ORANGE],
      lineSize: 2.5, lineSmooth: false,
      showTitle: true, title: "Month-over-Month Average Discharge Effectiveness Index", titleFontFace: FONT_BODY, titleFontSize: 14,
      showLegend: false,
      catAxisLabelColor: INK2, valAxisLabelColor: INK2, catAxisLabelFontSize: 9, valAxisLabelFontSize: 11,
      catAxisLabelRotate: 45,
      valGridLine: { color: GRID, size: 1 }, catGridLine: { style: "none" },
    }
  );
  footer(s, "Section 4.2 & 4.4 — Efficiency & Temporal Patterns");
}

// ---------------------------------------------------------------- Slide 6: Backlog & bottlenecks
{
  const s = pres.addSlide();
  lightBg(s);
  s.addText("More Than a Third of Reports Show an Active Backlog", {
    x: 0.6, y: 0.5, w: 12.1, h: 0.7, isTextBox: true, margin: 0,
    fontFace: FONT_HEAD, fontSize: 27, bold: true, color: NAVY,
  });
  const y = 1.9, d = 2.3;
  statCircle(s, 0.9, y, d, pct1(S.backlog.share_of_reports), "of reports fall in an active\nbacklog-accumulation window", { fill: ORANGE, valueSize: 28 });
  statCircle(s, 4.0, y, d, `${S.backlog.longest_streak_reports}`, `report longest streak\n(${S.backlog.longest_streak_start.split(",")[0]} – ${S.backlog.longest_streak_end})`, { fill: NAVY, valueSize: 34 });
  statCircle(s, 7.1, y, d, `+${num(S.backlog.peak_value)}`, `peak 14-day net inflow\n(${S.backlog.peak_date})`, { fill: RED, valueSize: 26 });

  s.addShape("roundRect", {
    x: 0.9, y: 5.35, w: 11.5, h: 1.35, rectRadius: 0.08,
    fill: { color: ICE }, line: { type: "none" },
  });
  s.addText(
    "Backlog-clearing (net outflow) dominated 2023–2024. The shift to the smaller 2025 population coincides with backlog-building episodes in mid-to-late 2024 — not with a more effective discharge process.",
    {
      x: 1.25, y: 5.45, w: 10.8, h: 1.15, isTextBox: true, margin: 0,
      fontFace: FONT_BODY, fontSize: 14, color: NAVY_DARK, valign: "middle",
    }
  );
  footer(s, "Section 4.3 — Backlog & Bottleneck Detection");
}

// ---------------------------------------------------------------- Slide 7: Key insight (dark)
{
  const s = pres.addSlide();
  darkBg(s);
  s.addText("The Central Finding", {
    x: 0.9, y: 0.8, w: 11.5, h: 0.6, isTextBox: true, margin: 0,
    fontFace: FONT_BODY, fontSize: 16, color: MUTED, charSpacing: 2,
  });
  s.addText(
    "A smaller population is not the same as a healthier pipeline.",
    {
      x: 0.9, y: 1.5, w: 11.5, h: 1.6, isTextBox: true, margin: 0,
      fontFace: FONT_HEAD, fontSize: 34, bold: true, color: WHITE, lineSpacingMultiple: 1.1,
    }
  );
  s.addText(
    "The 2025 drop in HHS care population is best explained by fewer new arrivals into the system — not by faster, more effective discharges. Discharge Effectiveness fell alongside the population, not against it.",
    {
      x: 0.9, y: 3.3, w: 10.8, h: 1.4, isTextBox: true, margin: 0,
      fontFace: FONT_BODY, fontSize: 18, color: ICE, lineSpacingMultiple: 1.3,
    }
  );
  s.addShape("roundRect", {
    x: 0.9, y: 5.0, w: 10.8, h: 1.5, rectRadius: 0.08,
    fill: { color: NAVY_DARK }, line: { type: "none" },
  });
  s.addText(
    "Recommended next step: separate root-cause analysis of intake volume vs. discharge-process performance — the two are currently conflated in headline reporting.",
    {
      x: 1.25, y: 5.2, w: 10.1, h: 1.1, isTextBox: true, margin: 0,
      fontFace: FONT_BODY, fontSize: 15, italic: true, color: ICE, valign: "middle",
    }
  );
  footer(s, "Section 5 — Discussion", true);
}

// ---------------------------------------------------------------- Slide 8: Outcome stability
{
  const s = pres.addSlide();
  lightBg(s);
  s.addText("Placement Outcomes Are Moderately Volatile", {
    x: 0.6, y: 0.5, w: 12.1, h: 0.7, isTextBox: true, margin: 0,
    fontFace: FONT_HEAD, fontSize: 28, bold: true, color: NAVY,
  });
  const y = 1.9, d = 2.3;
  statCircle(s, 1.75, y, d, ratio(S.stability.avg_score), "average Outcome Stability Score\n(30-day rolling CV)", { fill: NAVY, valueSize: 24 });
  statCircle(s, 5.5, y, d, `${S.stability.high_volatility_reports}`, `reports exceeded the\n${S.stability.high_volatility_threshold} volatility threshold`, { fill: RED, valueSize: 30 });
  statCircle(s, 9.25, y, d, ratio(S.weekday_vs_weekend.weekend_avg_discharge_effectiveness - S.weekday_vs_weekend.weekday_avg_discharge_effectiveness), "weekend vs. weekday gap\nin Discharge Effectiveness", { fill: ORANGE, valueSize: 24 });
  s.addText(
    "Lower is more consistent. A coefficient of variation near zero means discharge performance barely changed month to month; higher values mark stretches worth a closer case-management review.",
    {
      x: 0.9, y: 5.75, w: 11.5, h: 1.0, isTextBox: true, margin: 0,
      fontFace: FONT_BODY, fontSize: 15, color: INK2,
    }
  );
  footer(s, "Section 4.5 — Outcome Stability");
}

// ---------------------------------------------------------------- Slide 9: Forward-looking signal
{
  const s = pres.addSlide();
  lightBg(s);
  s.addText("Both Signals Point the Same Direction Into 2026", {
    x: 0.6, y: 0.5, w: 12.1, h: 0.7, isTextBox: true, margin: 0,
    fontFace: FONT_HEAD, fontSize: 26, bold: true, color: NAVY,
  });
  s.addChart(
    pres.ChartType.bar,
    [
      {
        name: "Backlog Accumulation Rate",
        labels: ["Latest actual", "Projected (+14 days)"],
        values: [S.forecast.backlog_accumulation_rate.last_actual, S.forecast.backlog_accumulation_rate.projected],
      },
    ],
    {
      x: 0.8, y: 1.5, w: 6.0, h: 4.6,
      chartColors: [BLUE],
      showTitle: true, title: "Backlog Accumulation Rate", titleFontFace: FONT_BODY, titleFontSize: 13,
      showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 12,
      catAxisLabelColor: INK2, valAxisLabelColor: INK2, catAxisLabelFontSize: 11, valAxisLabelFontSize: 10,
      valGridLine: { color: GRID, size: 1 }, catGridLine: { style: "none" },
      showLegend: false,
    }
  );
  s.addChart(
    pres.ChartType.bar,
    [
      {
        name: "Discharge Effectiveness Index",
        labels: ["Latest actual", "Projected (+14 days)"],
        values: [S.forecast.discharge_effectiveness_index.last_actual, S.forecast.discharge_effectiveness_index.projected],
      },
    ],
    {
      x: 7.0, y: 1.5, w: 5.5, h: 4.6,
      chartColors: [ORANGE],
      showTitle: true, title: "Discharge Effectiveness Index", titleFontFace: FONT_BODY, titleFontSize: 13,
      showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 12, dataLabelFormatCode: "0.0000",
      catAxisLabelColor: INK2, valAxisLabelColor: INK2, catAxisLabelFontSize: 11, valAxisLabelFontSize: 10,
      valAxisLabelFormatCode: "0.000",
      valGridLine: { color: GRID, size: 1 }, catGridLine: { style: "none" },
      showLegend: false,
    }
  );
  s.addText(
    "Directional trend projection only (simple linear fit, trailing 60 days) — not a validated forecast. Shown as an early-warning signal, not a prediction to plan around.",
    {
      x: 0.9, y: 6.3, w: 11.5, h: 0.8, isTextBox: true, margin: 0,
      fontFace: FONT_BODY, fontSize: 13, italic: true, color: RED,
    }
  );
  footer(s, "Section 6 — Lightweight Forecast");
}

// ---------------------------------------------------------------- Slide 10: Recommendations
{
  const s = pres.addSlide();
  lightBg(s);
  s.addText("Recommendations", {
    x: 0.6, y: 0.5, w: 12.1, h: 0.7, isTextBox: true, margin: 0,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: NAVY,
  });
  const recs = [
    ["1", "Separate root-cause analysis", "Investigate the Discharge Effectiveness decline independently from the population decline — they are not the same signal."],
    ["2", "Monitor backlog reversal", "Stand up automated alerting on Backlog Accumulation Rate turning positive for 2+ consecutive weeks."],
    ["3", "Clarify the apprehension footnote", "Confirm the exact definition of the footnoted CBP-custody metric with HHS before external use."],
    ["4", "Review weekday/weekend staffing", "A modest but consistent discharge-effectiveness gap favors weekends — worth a staffing-pattern review."],
    ["5", "Standardize reporting cadence", "Document gap-handling explicitly to improve the precision of future rate-based KPIs."],
  ];
  let y = 1.5;
  const rowH = 1.0;
  recs.forEach(([n, title, desc]) => {
    s.addShape("ellipse", { x: 0.9, y: y + 0.05, w: 0.55, h: 0.55, fill: { color: NAVY }, line: { type: "none" } });
    s.addText(n, { x: 0.9, y: y + 0.05, w: 0.55, h: 0.55, align: "center", valign: "middle", isTextBox: true, margin: 0, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: WHITE });
    s.addText(title, { x: 1.7, y: y - 0.02, w: 10.5, h: 0.4, isTextBox: true, margin: 0, fontFace: FONT_BODY, fontSize: 16, bold: true, color: NAVY });
    s.addText(desc, { x: 1.7, y: y + 0.35, w: 10.5, h: 0.5, isTextBox: true, margin: 0, fontFace: FONT_BODY, fontSize: 13, color: INK2 });
    y += rowH;
  });
  footer(s, "Section 7 — Recommendations");
}

// ---------------------------------------------------------------- Slide 11: Closing
{
  const s = pres.addSlide();
  darkBg(s);
  s.addText("Questions & Discussion", {
    x: 0.9, y: 2.9, w: 11.5, h: 1.0, isTextBox: true, margin: 0,
    fontFace: FONT_HEAD, fontSize: 36, bold: true, color: WHITE,
  });
  s.addText(
    "Full methodology, KPI definitions, and detailed findings are available in the accompanying research paper.",
    {
      x: 0.9, y: 3.9, w: 10.5, h: 0.8, isTextBox: true, margin: 0,
      fontFace: FONT_BODY, fontSize: 16, color: ICE,
    }
  );
  s.addNotes(
    "This deck summarizes reports/research_paper.docx. All figures are computed directly from HHS_Unaccompanied_Alien_Children_Program.csv via src/metrics.py and src/forecasting.py — see reports/analysis_summary.json for the underlying numbers."
  );
  footer(s, "HHS / Unified Mentor Internship Program", true);
}

const outPath = path.join(ROOT, "reports", "executive_summary.pptx");
pres.writeFile({ fileName: outPath }).then(() => console.log("Wrote", outPath));
