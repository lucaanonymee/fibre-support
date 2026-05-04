# AI Ticket Prediction Module

This module adds an explainable AI workflow to predict ticket response time and compute urgency scoring.

## What is included

1. Data simulation script
2. RandomForestRegressor training script
3. Prediction module with predict_time function
4. Scoring module with compute_score function
5. Python CLI bridge used by Express POST /api/predict
6. Model save/load with joblib
7. Example usage script

## Feature set used by the model

- type_encoded
- nbTicketsOuverts_admin
- heure_sin
- heure_cos
- jourCreation

No extra features are used.

## Label convention

- In simulated training data, the real observed target is stored in tempsReponse.
- In prediction/API output, the model returns tempsReponsePrevu.

This keeps a clear distinction between historical ground truth and predicted value.

## Business rules encoded in simulated training data

- Reclamations can be created 24/7.
- Operational treatment window:
  - Monday to Friday: 08:00 to 18:00
  - Saturday: 08:00 to 12:00
- Outside treatment windows, additional delay is applied in simulated response time.

## Setup

Install Python dependencies from backend/ai:

pip install -r requirements.txt

## Generate dataset

python src/data_simulation.py --samples 5000 --output data/simulated_tickets.csv

## Train model

python src/train_model.py --dataset data/simulated_tickets.csv --model-out model/ticket_rf.joblib

## Run example

python src/example_usage.py

## REST usage (through Node backend)

Endpoint standard: POST /predict (ou POST /api/predict) desactive volontairement
Endpoint protege ADMIN (charge calculee serveur): POST /predict/admin (ou /api/predict/admin)

Payload endpoint protege ADMIN (sans nbTicketsOuverts_admin):
{
  "typeProbleme": "COUPURE_TOTALE",
  "creationDate": "2026-04-09T08:30:00Z"
}

Notes d'exploitation:
- L'IA est declenchee automatiquement a la creation du ticket.
- aiScore, priorite et tempsReponsePrevu sont enregistres dans le ticket.
- Seul l'ADMIN consulte ces metriques (CLIENT/TECHNICIEN ne les voient pas).
- Le score et la priorite evoluent dynamiquement selon temps d'attente, SLA et statut.
