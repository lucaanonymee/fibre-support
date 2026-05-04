"""Feature engineering helpers used for training and inference."""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, Dict

from constants import TYPE_ENCODING


def parse_creation_date(value: Any) -> datetime:
    """Parse creation date from ISO string or datetime and ensure timezone awareness."""
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        text = value.strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        dt = datetime.fromisoformat(text)
    else:
        raise TypeError("creationDate must be an ISO string or datetime")

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return dt


def encode_type(type_probleme: str) -> int:
    """Map business problem type to the required encoded group (1, 2, or 3)."""
    try:
        return TYPE_ENCODING[type_probleme]
    except KeyError as exc:
        raise ValueError(f"Unsupported typeProbleme: {type_probleme}") from exc


def to_business_day_index(dt: datetime) -> int:
    """Convert Python weekday (Mon=0) to required business format (Sun=0..Sat=6)."""
    return (dt.weekday() + 1) % 7


def cyclical_hour_features(dt: datetime) -> Dict[str, float]:
    """Create cyclical hour features to model time as a circle, not a linear value."""
    hour_decimal = dt.hour + (dt.minute / 60.0) + (dt.second / 3600.0)
    angle = 2.0 * math.pi * (hour_decimal / 24.0)
    return {
        "heure_sin": math.sin(angle),
        "heure_cos": math.cos(angle),
    }


def build_feature_row(
    type_probleme: str,
    nb_tickets_ouverts_admin: int,
    creation_date: Any,
) -> Dict[str, float]:
    """Build the exact model feature vector from raw ticket input."""
    if nb_tickets_ouverts_admin is None:
        raise ValueError("nbTicketsOuverts_admin is required")

    if int(nb_tickets_ouverts_admin) < 0:
        raise ValueError("nbTicketsOuverts_admin must be >= 0")

    dt = parse_creation_date(creation_date)
    hour_features = cyclical_hour_features(dt)

    return {
        "type_encoded": encode_type(type_probleme),
        "nbTicketsOuverts_admin": int(nb_tickets_ouverts_admin),
        "heure_sin": hour_features["heure_sin"],
        "heure_cos": hour_features["heure_cos"],
        "jourCreation": to_business_day_index(dt),
    }
