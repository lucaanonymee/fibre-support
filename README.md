# Smart Fibre TT

Plateforme full-stack de gestion d'incidents fibre optique avec 4 roles metier:
SUPER_ADMIN, ADMIN, TECHNICIEN et CLIENT.

## Documentation du projet

- README general: ce fichier
- Frontend: [frontend/README.md](frontend/README.md)
- Backend API: [backend/README.md](backend/README.md)

## Architecture

Le projet est separe en deux applications:

```
.
├── backend/   # API REST Express + MongoDB
└── frontend/  # Application React (Vite)
```

## Fonctionnalites principales

- Authentification JWT avec cookies httpOnly
- Verification CSRF (double submit cookie)
- Gestion complete du cycle de ticket: OUVERT -> EN_COURS -> CLOTURE
- Attribution automatique d'un admin selon la zone geographique
- Gestion des techniciens (presence, categorie UGS/ULS, capacite)
- Reference metier ticket au format TT-<numero>
- Numero de telephone obligatoire uniquement pour le role CLIENT
- Notifications email (verification compte, reset mot de passe, cloture ticket)

## Stack technique

### Backend

- Node.js + Express 5
- MongoDB + Mongoose
- JWT + bcryptjs
- Helmet, CORS, CSRF, Rate limit, mongo sanitize
- Nodemailer

### Frontend 
- React + Vite + TypeScript
- React Router (multi-roles)
- Leaflet (cartographie)
- Lucide React
- Recharts

## Demarrage rapide

Option A - Lancement simultane backend + frontend (nouveau)

```bash
npm install
npm run dev
```

Cette commande se lance a la racine du projet et demarre les deux services via concurrently.

Option B - Lancement separe (comme actuellement)

1. Lancer le backend

```bash
cd backend
npm install
npm run dev
```

2. Lancer le frontend

```bash
cd frontend
npm install
npm run dev
```

3. Verifier l'API

- Test backend: GET http://localhost:5000/api/test
- Frontend Vite: http://localhost:5173

## Variables d'environnement

- Backend: voir [backend/README.md](backend/README.md)
- Frontend: voir [frontend/README.md](frontend/README.md)

## Notes

- Le frontend utilise des URLs relatives vers /api par defaut.
- Une URL backend explicite peut etre configuree via VITE_API_BASE_URL cote frontend.











