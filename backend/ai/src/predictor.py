"""Model loading and response-time prediction module."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd

from constants import FEATURE_COLUMNS
from features import build_feature_row

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_PATH = BASE_DIR / "model" / "ticket_rf.joblib"


@lru_cache(maxsize=4)
def _load_model_bundle(model_path: str):
    """Cache model loading so repeated predictions stay fast."""
    path = Path(model_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Model file not found at {path}. Run train_model.py before prediction."
        )
    return joblib.load(path)


def predict_time(
    type_probleme: str,
    nb_tickets_ouverts_admin: int,
    creation_date,
    model_path: str | None = None,
) -> float:
    """Predict tempsReponsePrevu in hours for one ticket."""
    resolved_model_path = str(Path(model_path) if model_path else DEFAULT_MODEL_PATH)
    model_bundle = _load_model_bundle(resolved_model_path)

    model = model_bundle["model"]
    feature_columns = model_bundle.get("feature_columns", FEATURE_COLUMNS)

    feature_row = build_feature_row(type_probleme, nb_tickets_ouverts_admin, creation_date)
    feature_frame = pd.DataFrame(
        [[feature_row[column] for column in feature_columns]],
        columns=feature_columns,
    )

    prediction = float(model.predict(feature_frame)[0])
    return round(max(1.0, prediction), 2)
