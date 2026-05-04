"""Simple end-to-end example for prediction and scoring."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from predictor import predict_time
from scoring import compute_score, compute_waiting_hours


def main() -> int:
    sample_creation_date = (datetime.now(timezone.utc) - timedelta(hours=10)).isoformat()
    sample_payload = {
        "typeProbleme": "COUPURE_TOTALE",
        "nbTicketsOuverts_admin": 7,
        "creationDate": sample_creation_date,
    }

    predicted_time = predict_time(
        type_probleme=sample_payload["typeProbleme"],
        nb_tickets_ouverts_admin=sample_payload["nbTicketsOuverts_admin"],
        creation_date=sample_payload["creationDate"],
    )

    waiting_hours = compute_waiting_hours(sample_payload["creationDate"])
    scoring = compute_score(
        type_probleme=sample_payload["typeProbleme"],
        waiting_hours=waiting_hours,
        temps_reponse_prevu=predicted_time,
    )

    result = {
        "input": sample_payload,
        "output": {
            "tempsReponsePrevu": predicted_time,
            "score": scoring["score"],
            "priorite": scoring["priorite"],
        },
    }

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
