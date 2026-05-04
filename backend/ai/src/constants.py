"""Shared constants for the ticket AI module."""

TYPE_ENCODING = {
    "COUPURE_TOTALE": 1,
    "QUALITE_DEGRADEE": 1,
    "MODEM_DEFECTUEUX": 2,
    "CABLE_ENDOMMAGE": 2,
    "CONFIG_MODEM": 3,
    "DEBIT_FAIBLE": 3,
}

TYPE_SCORE_BY_GROUP = {
    1: 1.0,
    2: 0.7,
    3: 0.4,
}

FEATURE_COLUMNS = [
    "type_encoded",
    "nbTicketsOuverts_admin",
    "heure_sin",
    "heure_cos",
    "jourCreation",
]

VALID_TYPES = tuple(TYPE_ENCODING.keys())
