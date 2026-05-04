"""Train and persist a RandomForestRegressor for ticket response-time prediction."""

from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from constants import FEATURE_COLUMNS
from data_simulation import generate_dataset

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATASET_PATH = BASE_DIR / "data" / "simulated_tickets.csv"
DEFAULT_MODEL_PATH = BASE_DIR / "model" / "ticket_rf.joblib"
DEFAULT_METRICS_PATH = BASE_DIR / "model" / "metrics.json"
TARGET_COLUMN = "tempsReponse"


def ensure_dataset(dataset_path: Path, samples: int, seed: int) -> pd.DataFrame:
    """Load dataset if present, otherwise auto-generate one."""
    if dataset_path.exists():
        return pd.read_csv(dataset_path)

    dataset_path.parent.mkdir(parents=True, exist_ok=True)
    df = generate_dataset(sample_size=samples, seed=seed)
    df.to_csv(dataset_path, index=False)
    return df


def validate_columns(df: pd.DataFrame) -> None:
    required_columns = FEATURE_COLUMNS + [TARGET_COLUMN]
    missing = [column for column in required_columns if column not in df.columns]
    if missing:
        # Backward compatibility for old datasets that used tempsReponsePrevu as label.
        if TARGET_COLUMN in missing and "tempsReponsePrevu" in df.columns:
            return
        raise ValueError(f"Dataset missing required columns: {', '.join(missing)}")


def train_random_forest(df: pd.DataFrame, seed: int) -> Dict[str, object]:
    """Train model and compute evaluation metrics."""
    validate_columns(df)

    x = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN] if TARGET_COLUMN in df.columns else df["tempsReponsePrevu"]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=seed,
    )

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=14,
        min_samples_leaf=2,
        random_state=seed,
        n_jobs=-1,
    )
    model.fit(x_train, y_train)

    predictions = model.predict(x_test)

    metrics = {
        "mae": round(float(mean_absolute_error(y_test, predictions)), 4),
        "rmse": round(float(math.sqrt(mean_squared_error(y_test, predictions))), 4),
        "r2": round(float(r2_score(y_test, predictions)), 4),
        "n_train": int(len(x_train)),
        "n_test": int(len(x_test)),
    }

    return {
        "model": model,
        "metrics": metrics,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train ticket response-time predictor")
    parser.add_argument("--dataset", type=str, default=str(DEFAULT_DATASET_PATH), help="Input CSV path")
    parser.add_argument("--model-out", type=str, default=str(DEFAULT_MODEL_PATH), help="Output model path")
    parser.add_argument("--metrics-out", type=str, default=str(DEFAULT_METRICS_PATH), help="Output metrics path")
    parser.add_argument("--samples", type=int, default=5000, help="Rows to generate if dataset is missing")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    dataset_path = Path(args.dataset)
    model_path = Path(args.model_out)
    metrics_path = Path(args.metrics_out)

    df = ensure_dataset(dataset_path=dataset_path, samples=args.samples, seed=args.seed)
    training_result = train_random_forest(df=df, seed=args.seed)

    model_bundle = {
        "model": training_result["model"],
        "feature_columns": FEATURE_COLUMNS,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    model_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_path.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(model_bundle, model_path)
    metrics_path.write_text(json.dumps(training_result["metrics"], indent=2), encoding="utf-8")

    print(f"Model saved to: {model_path}")
    print(f"Metrics saved to: {metrics_path}")
    print(json.dumps(training_result["metrics"], indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
