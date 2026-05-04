
# Smart Fibre TT

Frontend React + Vite + TypeScript pour la gestion des incidents fibre optique (multi-roles).

## Etat actuel

- Gestion par roles: Client, Admin, Technicien, Superadmin.
- Navigation et ecrans metier bases sur React Router.
- Cartographie integree (Leaflet) pour la localisation des tickets/zone.
- Flux connectes au backend reel:
  - login
  - inscription client
  - verification email + renvoi code + changement email
  - creation ticket client
- D'autres ecrans restent principalement des maquettes visuelles et doivent etre relies endpoint par endpoint.

## Stack technique

- React 18
- TypeScript
- React Router
- Vite
- Lucide React
- Leaflet

## Prerequis

- Node.js 18+ recommande
- npm 9+ recommande

## Installation

```bash
npm install
```

## Lancement en developpement

```bash
npm run dev
```

## Build production

```bash
npm run build
```

## Scripts disponibles

- `npm run dev` : demarrer Vite en mode developpement
- `npm run build` : generer le bundle de production

## Configuration environnement

Option 1 (recommandee): utiliser le proxy Vite en local (deja configure sur `/api` vers `http://localhost:5000`).

Option 2: definir un backend explicite via `.env` a la racine frontend:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_RECAPTCHA_SITE_KEY=votre_cle_site_recaptcha_v2
```

Un fichier modele est disponible: `.env.example`.

## Routes principales

- `/` : landing page
- `/auth/*` : authentification
- `/client/*` : espace client
- `/admin/*` : espace admin
- `/tech/*` : espace technicien
- `/superadmin/*` : espace superadmin
- `/legal/*` : pages legales

## Structure projet (frontend)

- `src/app/routes.ts` : declaration des routes
- `src/app/pages` : pages par role et pages auth/legal
- `src/app/components` : layout et composants partages
- `src/app/context/ProfileContext.tsx` : etat profil global (photo incluse)
- `src/app/utils/profileApi.ts` : appels API profil/photo
- `src/styles` : styles globaux
  