"""CLI bridge used by the Node.js API to get prediction + scoring."""

from __future__ import annotations

import json
import sys
from typing import Any, Dict

from predictor import predict_time
from scoring import compute_score, compute_waiting_hours


def _read_payload() -> Dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw and len(sys.argv) > 1:
        raw = sys.argv[1]

    if not raw:
        raise ValueError("Empty payload: expected JSON input")

    payload = json.loads(raw)
    if not isinstance(payload, dict):
        raise ValueError("Payload must be a JSON object")

    return payload


def _validate_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    required_fields = ["typeProbleme", "nbTicketsOuverts_admin", "creationDate"]
    missing = [field for field in required_fields if field not in payload]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    normalized = {
        "typeProbleme": str(payload["typeProbleme"]),
        "nbTicketsOuverts_admin": int(payload["nbTicketsOuverts_admin"]),
        "creationDate": payload["creationDate"],
    }

    if normalized["nbTicketsOuverts_admin"] < 0:
        raise ValueError("nbTicketsOuverts_admin must be >= 0")

    return normalized


def run_prediction(payload: Dict[str, Any]) -> Dict[str, Any]:
    validated = _validate_payload(payload)

    predicted_hours = predict_time(
        type_probleme=validated["typeProbleme"],
        nb_tickets_ouverts_admin=validated["nbTicketsOuverts_admin"],
        creation_date=validated["creationDate"],
    )

    waiting_hours = compute_waiting_hours(validated["creationDate"])
    score_data = compute_score(
        type_probleme=validated["typeProbleme"],
        waiting_hours=waiting_hours,
        temps_reponse_prevu=predicted_hours,
    )

    return {
        "tempsReponsePrevu": predicted_hours,
        "score": score_data["score"],
        "priorite": score_data["priorite"],
    }


def main() -> int:
    try:
        payload = _read_payload()
        response = run_prediction(payload)
        print(json.dumps(response))
        return 0
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
