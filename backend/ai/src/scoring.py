"""AI score and priority computation for ticket urgency."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict

from constants import TYPE_SCORE_BY_GROUP
from features import encode_type, parse_creation_date


def compute_waiting_hours(creation_date) -> float:
    """Compute waiting time in hours between now (UTC) and ticket creation date."""
    created_at = parse_creation_date(creation_date).astimezone(timezone.utc)
    now_utc = datetime.now(timezone.utc)

    waiting_hours = (now_utc - created_at).total_seconds() / 3600.0
    return max(0.0, waiting_hours)


def priority_from_score(score: float) -> str:
    """Map a numerical score to business priority labels."""
    if score >= 85:
        return "TRES_ELEVEE"
    if score >= 60:
        return "ELEVEE"
    if score >= 40:
        return "MOYENNE"
    return "BASSE"


def compute_score(type_probleme: str, waiting_hours: float, temps_reponse_prevu: float) -> Dict[str, float]:
    """Compute explainable AI score based on type, waiting pressure, and SLA pressure."""
    type_group = encode_type(type_probleme)
    type_score = TYPE_SCORE_BY_GROUP[type_group]

    waiting_normalized = min(1.0, max(0.0, waiting_hours / 24.0))

    safe_prediction = max(float(temps_reponse_prevu), 0.1)
    sla_ratio = waiting_hours / safe_prediction
    sla_normalized = min(1.0, max(0.0, sla_ratio))

    score = 100.0 * (
        0.4 * type_score
        + 0.3 * waiting_normalized
        + 0.3 * sla_normalized
    )

    if sla_ratio > 1.0:
        score += 10.0

    score = min(100.0, max(0.0, score))

    return {
        "score": round(score, 2),
        "priorite": priority_from_score(score),
        "waiting_hours": round(waiting_hours, 2),
        "waiting_normalized": round(waiting_normalized, 3),
        "sla_ratio": round(sla_ratio, 3),
        "sla_normalized": round(sla_normalized, 3),
    }
