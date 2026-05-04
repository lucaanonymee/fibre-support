# Smart Fibre TT - Backend API

Backend REST de Smart Fibre TT construit avec Express + MongoDB.

## Vue d'ensemble

Le backend gere:

- Authentification et autorisation par roles
- Gestion des utilisateurs (superadmin, admin, technicien, client)
- Gestion complete des tickets fibre
- Notifications email (verification, reset, cloture, bienvenue)
- Securite API (helmet, CSRF, rate limit, sanitize)
- Réclamations ouvertes 24h/24 et 7j/7
- Traitement operationnel: lundi-vendredi 08:00-18:00, samedi 08:00-12:00

## Stack technique

- Node.js
- Express 5
- MongoDB + Mongoose
- Python 3 (module IA)
- JWT + cookies httpOnly
- bcryptjs
- Nodemailer
- Helmet
- CORS
- express-rate-limit
- express-mongo-sanitize
- cookie-parser

## Prerequis

- Node.js 18+
- npm 9+
- MongoDB local ou Atlas
- Compte Gmail avec mot de passe d'application (pour l'envoi d'emails)

## Installation

```bash
npm install
```

## Scripts

- npm run dev : demarrer le serveur avec nodemon
- npm start : demarrer le serveur en mode normal
- npm run ai:data : generer un dataset IA simule
- npm run ai:train : entrainer le modele RandomForest et sauvegarder le modele
- npm run ai:example : executer un exemple prediction + score

## Lancement

```bash
npm run dev
```

Serveur par defaut:

- http://localhost:5000
- Test API: GET /api/test

## Variables d'environnement

Creer un fichier .env dans le dossier backend:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smart-fibre-tt
JWT_SECRET=changer_ce_secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=changer_ce_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
EMAIL_USER=votre_email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
RECAPTCHA_SECRET_KEY=votre_cle_secrete_recaptcha_v2
NODE_ENV=development
PYTHON_BIN=python
AI_PYTHON_TIMEOUT_MS=15000
AI_PYTHON_WARMUP_TIMEOUT_MS=60000
MAX_CODE_FAILURES=5
CODE_BLOCK_MINUTES=15
UNVERIFIED_ACCOUNT_RETENTION_DAYS=3
UNVERIFIED_CLEANUP_INTERVAL_MS=86400000
```

Variables minimales obligatoires:

- JWT_SECRET
- MONGO_URI
- EMAIL_USER
- EMAIL_PASSWORD
- RECAPTCHA_SECRET_KEY

Variables IA optionnelles:

- PYTHON_BIN (interpreter Python a utiliser)
- AI_PYTHON_TIMEOUT_MS (timeout en ms pour le calcul IA)
- AI_PYTHON_WARMUP_TIMEOUT_MS (timeout en ms reserve au warm-up IA au demarrage)

Variables securite/maintenance optionnelles:

- MAX_CODE_FAILURES (nombre max de codes invalides consecutifs avant blocage temporaire, defaut: 5)
- CODE_BLOCK_MINUTES (duree du blocage temporaire apres trop de codes invalides, defaut: 15)
- UNVERIFIED_ACCOUNT_RETENTION_DAYS (suppression des comptes CLIENT non verifies plus anciens que cette valeur en jours, defaut: 3)
- UNVERIFIED_CLEANUP_INTERVAL_MS (frequence de controle de suppression automatique, en millisecondes, defaut: 86400000 = 1 jour)

Nettoyage automatique des comptes non verifies:

- Cible: uniquement role CLIENT avec emailVerifie=false
- Conservation par defaut: 3 jours
- Controle par defaut: toutes les 24h (1 jour)
- Execution: une fois au demarrage du serveur, puis a chaque intervalle configure

## Module IA tickets

Le dossier ai/ contient:

- Simulation de donnees (data_simulation.py)
- Entrainement RandomForestRegressor (train_model.py)
- Prediction (predictor.py)
- Scoring priorite (scoring.py)
- Bridge CLI pour Node (predict_api.py)

Installation des dependances Python:

```bash
pip install -r ai/requirements.txt
```

Generation dataset + entrainement modele:

```bash
npm run ai:data
npm run ai:train
```

Le modele est sauvegarde dans ai/model/ticket_rf.joblib.

## Securite active

Le backend applique les protections suivantes:

- Helmet + HSTS
- CORS avec credentials
- CSRF via double submit cookie
- Rate limiting global et specifique (login/register/email)
- Sanitization anti NoSQL injection
- Sanitization des chaines pour limiter les payloads XSS
- Cookies httpOnly pour accessToken et refreshToken

## Auth et CSRF (important pour le frontend)

1. Authentification:
- POST /api/login
- Le backend place accessToken et refreshToken en cookies httpOnly

2. CSRF:
- GET /api/csrf-token pour recuperer le token
- Envoyer ensuite x-csrf-token sur les requetes POST/PUT/DELETE

## Roles metier

- SUPER_ADMIN
- ADMIN
- TECHNICIEN
- CLIENT

Regles metier importantes:

- numTelephone est obligatoire uniquement pour CLIENT
- zoneIntervention est obligatoire pour ADMIN et TECHNICIEN
- categorie (UGS/ULS) est obligatoire pour TECHNICIEN

## Tickets

- Statuts: OUVERT, EN_COURS, CLOTURE
- Reference metier ticket: TT-<numero> (ex: TT-125)
- Un ticket peut etre manipule par _id MongoDB ou ticketRef selon l'endpoint

## Routes principales

### Auth

- POST /api/login
- POST /api/register
- POST /api/verifier-email
- POST /api/renvoyer-code
- PUT /api/modifier-email
- POST /api/mot-de-passe-oublie
- POST /api/verifier-code-reset
- POST /api/reset-mot-de-passe
- POST /api/refresh-token
- POST /api/logout

### Superadmin

- POST /api/superadmin/admin
- GET /api/superadmin/admins
- PUT /api/superadmin/desactiver/:id
- PUT /api/superadmin/reactiver/:id

### Admin

- POST /api/admin/technicien
- PUT /api/admin/assigner-ticket
- GET /api/admin/tickets
- PUT /api/admin/marquer-present/:id
- PUT /api/admin/marquer-absent/:id
- GET /api/admin/techniciens
- PUT /api/admin/desactiver/:id
- PUT /api/admin/reactiver/:id

### Client

- POST /api/client/ticket
- GET /api/client/tickets

### Technicien

- GET /api/technicien/tickets
- PUT /api/technicien/ticket/:id
- GET /api/technicien/historique/:sn

### Utilisateur

- GET /api/utilisateur/profil
- PUT /api/utilisateur/profil

### IA

- POST /predict (desactive volontairement pour eviter le passage manuel de nbTicketsOuverts_admin)
- POST /api/predict (alias desactive)
- POST /predict/admin (protege ADMIN)
- POST /api/predict/admin (alias protege ADMIN)

Input JSON pour endpoint protege ADMIN (sans nbTicketsOuverts_admin):

```json
{
	"typeProbleme": "COUPURE_TOTALE",
	"creationDate": "2026-04-09T08:30:00Z"
}
```

Output JSON (charge admin calculee cote serveur):

```json
{
	"adminId": "...",
	"nbTicketsOuverts_admin": 5,
	"tempsReponsePrevu": 10.9,
	"score": 77.3,
	"priorite": "ELEVEE"
}
```

Comportement metier IA:

- A la creation d'un ticket client, l'admin est assigne automatiquement puis l'IA calcule tempsReponsePrevu, aiScore et priorite.
- Les valeurs IA sont enregistrees dans le ticket.
- Le score et la priorite sont recalcules dynamiquement pour l'admin (en fonction du temps d'attente, SLA et statut du ticket).
- Les champs IA (tempsReponsePrevu, aiScore, priorite) sont masques pour CLIENT et TECHNICIEN.
- Les tickets technicien sont tries selon l'ordre d'assignation admin (assignationDate croissante).

## Structure backend

- server.js
- config/db.js
- config/email.js
- controllers/
- middlewares/
- models/
- routes/

## Documentation complementaire

- Diagrammes de sequence complets: [docs/sequence-diagram-complet.md](docs/sequence-diagram-complet.md)
- Checklist Postman (cas d'erreur): [docs/postman-checklist-erreurs.md](docs/postman-checklist-erreurs.md)
- Matrice de permissions: [docs/matrice-permissions.md](docs/matrice-permissions.md)
