TYPESCRIPT 
leaflet.js
jwt
https/tls 





# Smart Fibre TT — Système de Gestion de Tickets

Application web full-stack de gestion de tickets pour une entreprise de fibre optique. Elle permet aux clients de signaler des problèmes liés à la fibre, aux administrateurs de gérer et assigner les tickets, et aux techniciens de les résoudre sur le terrain.

## Architecture

Le projet suit l'architecture **MERN** (MongoDB, Express, React, Node.js) avec une séparation claire entre le frontend et le backend.

```
├── backend/          # API REST (Express / Node.js)
│   ├── config/       # Configuration DB & Email
│   ├── controllers/  # Logique métier
│   ├── middlewares/   # Authentification & autorisation
│   ├── models/        # Modèles Mongoose (Utilisateur, Ticket)
│   └── routes/        # Définition des routes API
└── frontend/         # Application React (Vite)
    └── src/
```

## Technologies utilisées

### Frontend

| Technologie | Version | Description |
|---|---|---|
| **React** | 19.2 | Bibliothèque UI pour la construction d'interfaces |
| **React DOM** | 19.2 | Rendu React dans le navigateur |
| **React Router DOM** | 7.13 | Routage côté client (SPA) |
| **Axios** | 1.13 | Client HTTP pour les appels API |
| **Vite** | 7.2 | Outil de build & serveur de développement rapide |
| **ESLint** | 9.39 | Linting et qualité de code |

### Backend

| Technologie | Version | Description |
|---|---|---|
| **Node.js** | — | Environnement d'exécution JavaScript côté serveur |
| **Express** | 5.2 | Framework web minimaliste pour l'API REST |
| **Mongoose** | 9.1 | ODM pour MongoDB (modèles, schémas, requêtes) |
| **JSON Web Token (JWT)** | 9.0 | Authentification par tokens |
| **bcryptjs** | 2.4 | Hachage sécurisé des mots de passe |
| **Nodemailer** | 8.0 | Envoi d'emails (vérification, réinitialisation) |
| **dotenv** | 17.2 | Gestion des variables d'environnement |
| **CORS** | 2.8 | Gestion des requêtes cross-origin |
| **Nodemon** | 3.1 | Rechargement automatique en développement |

### Base de données

| Technologie | Description |
|---|---|
| **MongoDB** | Base de données NoSQL orientée documents |
| **Mongoose** | Modélisation des données avec support GeoJSON |

## Fonctionnalités principales

- **Authentification & Autorisation** : JWT + bcrypt avec contrôle d'accès basé sur les rôles (RBAC)
- **4 rôles hiérarchiques** : `SUPER_ADMIN` → `ADMIN` → `TECHNICIEN` → `CLIENT`
- **Gestion de tickets** : Création, assignation et suivi (OUVERT → EN_COURS → CLOTURE)
- **Géolocalisation** : Zones d'intervention GeoJSON pour les admins et techniciens
- **Notifications email** : Vérification de compte et réinitialisation de mot de passe (Gmail SMTP)
- **Suivi de présence** : Gestion de la présence quotidienne des techniciens
- **Catégories de techniciens** : UGS (intervention à distance) / ULS (intervention sur site)
- **Soft delete** : Désactivation de comptes sans suppression définitive
- **Priorité IA** : Champs prévus pour la priorisation intelligente des tickets

## Routes API

| Module | Endpoint | Description |
|---|---|---|
| Auth | `/api/auth/*` | Connexion, inscription client, vérification email, reset mot de passe |
| Super Admin | `/api/superadmin/*` | Gestion des administrateurs |
| Admin | `/api/admin/*` | Gestion des techniciens et des tickets |
| Client | `/api/client/*` | Soumission et consultation des tickets |
| Technicien | `/api/technicien/*` | Traitement des tickets assignés |
| Utilisateur | `/api/utilisateur/*` | Gestion du profil utilisateur |

## Installation

### Prérequis

- Node.js (v18+)
- MongoDB (local ou Atlas)
- Compte Gmail avec mot de passe d'application (pour Nodemailer)

### Backend

```bash
cd backend
npm install
# Créer un fichier .env avec les variables nécessaires :
# MONGO_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASSWORD, PORT
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Le frontend proxy automatiquement les requêtes `/api` vers `http://localhost:5000` grâce à la configuration Vite.

## Variables d'environnement

Créer un fichier `.env` dans le dossier `backend/` :

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/smart-fibre-tt
JWT_SECRET=votre_secret_jwt
EMAIL_USER=votre_email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_application
```











