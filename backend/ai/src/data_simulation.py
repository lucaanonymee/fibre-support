"""Generate a realistic dataset with observed response times for training."""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from constants import TYPE_ENCODING
from features import build_feature_row

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_PATH = BASE_DIR / "data" / "simulated_tickets.csv"

# Operational baseline (in hours) by type group.
BASE_RESPONSE_BY_GROUP = {
    1: 8.0,
    2: 6.0,
    3: 4.0,
}

TYPE_VALUES = list(TYPE_ENCODING.keys())
TYPE_PROBABILITIES = [0.22, 0.18, 0.18, 0.14, 0.14, 0.14]


def business_delay_hours(day_index: int, hour: int) -> float:
    """Apply explicit business rules requested by operations."""
    # jourCreation mapping used by the project: Sunday=0, Monday=1, ..., Saturday=6.
    is_weekday = 1 <= day_index <= 5
    is_saturday = day_index == 6
    is_sunday = day_index == 0

    # Operational treatment window:
    # - Monday to Friday: 08:00 -> 18:00
    # - Saturday: 08:00 -> 12:00
    if is_weekday and 8 <= hour < 18:
        return 0.0

    if is_saturday and 8 <= hour < 12:
        return 0.0

    # Reclamations can be created 24/7, but treatment outside working windows is delayed.
    if is_sunday:
        return 4.0

    if is_saturday:
        return 2.5

    # Weekday outside the 08:00-18:00 treatment window.
    return 2.0


def simulate_response_time(
    type_group: int,
    nb_open_tickets: int,
    day_index: int,
    hour: int,
    rng: np.random.Generator,
) -> float:
    """Build observed response time (ground truth) with business effects and noise."""
    base = BASE_RESPONSE_BY_GROUP[type_group]
    workload_effect = 0.45 * nb_open_tickets
    rule_effect = business_delay_hours(day_index, hour)
    noise = rng.normal(loc=0.0, scale=1.1)

    response_time = base + workload_effect + rule_effect + noise
    return round(max(1.0, min(72.0, response_time)), 2)


def generate_dataset(sample_size: int, seed: int = 42) -> pd.DataFrame:
    """Generate synthetic historical tickets for supervised training."""
    rng = np.random.default_rng(seed)
    now_utc = datetime.now(timezone.utc)

    rows = []
    for _ in range(sample_size):
        type_probleme = rng.choice(TYPE_VALUES, p=TYPE_PROBABILITIES)

        # Per-admin open workload at creation time.
        nb_tickets_ouverts_admin = int(np.clip(rng.poisson(lam=6), 0, 30))

        # Ticket creation is allowed 24/7 and spread over recent months.
        minutes_back = int(rng.integers(0, 180 * 24 * 60))
        creation_dt = now_utc - timedelta(minutes=minutes_back)

        feature_row = build_feature_row(
            type_probleme=type_probleme,
            nb_tickets_ouverts_admin=nb_tickets_ouverts_admin,
            creation_date=creation_dt,
        )

        day_index = int(feature_row["jourCreation"])
        response_time = simulate_response_time(
            type_group=int(feature_row["type_encoded"]),
            nb_open_tickets=nb_tickets_ouverts_admin,
            day_index=day_index,
            hour=creation_dt.hour,
            rng=rng,
        )

        rows.append(
            {
                "typeProbleme": type_probleme,
                "type_encoded": feature_row["type_encoded"],
                "nbTicketsOuverts_admin": feature_row["nbTicketsOuverts_admin"],
                "creationDate": creation_dt.isoformat(),
                "heureCreation": creation_dt.hour,
                "heure_sin": feature_row["heure_sin"],
                "heure_cos": feature_row["heure_cos"],
                "jourCreation": feature_row["jourCreation"],
                # Ground-truth label used to train the model.
                "tempsReponse": response_time,
            }
        )

    return pd.DataFrame(rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic ticket dataset")
    parser.add_argument("--samples", type=int, default=5000, help="Number of synthetic rows")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument(
        "--output",
        type=str,
        default=str(DEFAULT_OUTPUT_PATH),
        help="CSV output path",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.samples <= 0:
        raise ValueError("--samples must be > 0")

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    df = generate_dataset(sample_size=args.samples, seed=args.seed)
    df.to_csv(output_path, index=False)

    print(f"Dataset generated: {output_path}")
    print(f"Rows: {len(df)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
