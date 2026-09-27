"""Load and clean the HHS UAC daily custody/transfer/discharge CSV.

See PLAN.md section 2 for the data-cleaning checklist this implements:
drop blank trailing rows, strip thousands separators, parse dates,
compute inter-report gaps, and flag basic data-quality anomalies.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_CSV_PATH = PROJECT_ROOT / "data" / "raw" / "HHS_Unaccompanied_Alien_Children_Program.csv"
PROCESSED_CSV_PATH = PROJECT_ROOT / "data" / "processed" / "cleaned_daily.csv"

# The apprehension column carries a footnote marker ("*") in the source file
# whose exact definition is not included in this extract - see PLAN.md section 2/9.
COLUMN_RENAME = {
    "Date": "date",
    "Children apprehended and placed in CBP custody*": "apprehended",
    "Children in CBP custody": "cbp_custody",
    "Children transferred out of CBP custody": "transferred_out_cbp",
    "Children in HHS Care": "hhs_care",
    "Children discharged from HHS Care": "discharged",
}

NUMERIC_COLUMNS = [
    "apprehended",
    "cbp_custody",
    "transferred_out_cbp",
    "hhs_care",
    "discharged",
]


def load_raw(path: Path = RAW_CSV_PATH) -> pd.DataFrame:
    df = pd.read_csv(path)
    df = df.rename(columns=COLUMN_RENAME)
    return df.dropna(how="all")


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    for col in NUMERIC_COLUMNS:
        df[col] = df[col].astype(str).str.replace(",", "", regex=False).str.strip()
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["date"] = pd.to_datetime(df["date"], format="%B %d, %Y", errors="coerce")

    df = df.dropna(subset=["date", *NUMERIC_COLUMNS])
    df = df.sort_values("date").reset_index(drop=True)

    df["days_since_prior_report"] = df["date"].diff().dt.days
    df["data_quality_flag"] = _flag_anomalies(df)

    return df


def _flag_anomalies(df: pd.DataFrame) -> pd.Series:
    """Best-effort data-quality flags. Rows are kept (not dropped) so the
    research paper can report on anomalies rather than silently hide them.
    """
    flags = pd.Series([pd.NA] * len(df), index=df.index, dtype="object")

    negative_mask = (df[NUMERIC_COLUMNS] < 0).any(axis=1)
    flags[negative_mask] = "negative_value"

    discharge_exceeds_prior_stock = df["discharged"] > df["hhs_care"].shift(1)
    still_unflagged = flags.isna()
    flags[discharge_exceeds_prior_stock.fillna(False) & still_unflagged] = (
        "discharge_exceeds_prior_hhs_stock"
    )

    return flags


def load_and_clean(path: Path = RAW_CSV_PATH) -> pd.DataFrame:
    return clean(load_raw(path))


def save_processed(df: pd.DataFrame, path: Path = PROCESSED_CSV_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)


if __name__ == "__main__":
    cleaned = load_and_clean()
    save_processed(cleaned)
    print(f"Cleaned {len(cleaned)} rows -> {PROCESSED_CSV_PATH}")
    print(cleaned["data_quality_flag"].value_counts(dropna=False))
