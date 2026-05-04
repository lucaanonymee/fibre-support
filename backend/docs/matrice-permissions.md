# Matrice de permissions par role

Ce document indique qui peut appeler quoi, avec les preconditions metier et les erreurs typiques.

## Regles transverses

- Les methodes POST/PUT/DELETE sous /api exigent un token CSRF valide.
- Les routes protegees exigent un cookie accessToken valide.
- Les comptes inactifs sont bloques par authenticateToken.
- Rate limit global: 100 req / 15 min / IP sur /api.

## Legende

- OUI: autorise
- NON: refuse
- PUBLIC: sans role (non authentifie)

## Endpoints publics

| Endpoint | Method | SUPER_ADMIN | ADMIN | TECHNICIEN | CLIENT | Preconditions | Erreurs frequentes |
|---|---|---|---|---|---|---|---|
| /api/test | GET | PUBLIC | PUBLIC | PUBLIC | PUBLIC | Aucune | 429 rate limit |
| /api/csrf-token | GET | PUBLIC | PUBLIC | PUBLIC | PUBLIC | Aucune | 429 rate limit |
| /api/login | POST | PUBLIC | PUBLIC | PUBLIC | PUBLIC | email + motDePasse + CSRF | 400, 401, 403, 429 |
| /api/register | POST | PUBLIC | PUBLIC | PUBLIC | PUBLIC | nom + email + motDePasse + numTelephone + CSRF | 400, 429 |
| /api/verifier-email | POST | PUBLIC | PUBLIC | PUBLIC | PUBLIC | email + code + CSRF | 400, 404, 429 |
| /api/renvoyer-code | POST | PUBLIC | PUBLIC | PUBLIC | PUBLIC | email + CSRF | 400, 404, 429 |
| /api/modifier-email | PUT | PUBLIC | PUBLIC | PUBLIC | PUBLIC | ancienEmail + nouvelEmail + CSRF | 400, 404, 429 |
| /api/mot-de-passe-oublie | POST | PUBLIC | PUBLIC | PUBLIC | PUBLIC | email + CSRF | 400, 403, 404, 429 |
| /api/verifier-code-reset | POST | PUBLIC | PUBLIC | PUBLIC | PUBLIC | email + code + CSRF | 400, 429 |
| /api/reset-mot-de-passe | POST | PUBLIC | PUBLIC | PUBLIC | PUBLIC | email + nouveauMotDePasse + confirmation + CSRF | 400, 429 |
| /api/refresh-token | POST | PUBLIC | PUBLIC | PUBLIC | PUBLIC | cookie refreshToken + CSRF | 400, 401, 403, 429 |
| /api/logout | POST | PUBLIC | PUBLIC | PUBLIC | PUBLIC | CSRF (cookie refresh facultatif) | 403, 429 |
| /api/predict | POST | PUBLIC | PUBLIC | PUBLIC | PUBLIC | CSRF | 410 |

## Endpoints Super Admin

| Endpoint | Method | SUPER_ADMIN | ADMIN | TECHNICIEN | CLIENT | Preconditions | Erreurs frequentes |
|---|---|---|---|---|---|---|---|
| /api/superadmin/admin | POST | OUI | NON | NON | NON | accessToken role SUPER_ADMIN actif + CSRF + champs admin valides | 400, 403, 429 |
| /api/superadmin/admins | GET | OUI | NON | NON | NON | accessToken role SUPER_ADMIN actif | 401, 403, 429 |
| /api/superadmin/desactiver/:id | PUT | OUI | NON | NON | NON | accessToken role SUPER_ADMIN actif + admin cible actif + remplacant couvrant zone + CSRF | 400, 403, 404, 429 |
| /api/superadmin/reactiver/:id | PUT | OUI | NON | NON | NON | accessToken role SUPER_ADMIN + admin cible inactif + CSRF | 400, 403, 404, 429 |

## Endpoints Admin

| Endpoint | Method | SUPER_ADMIN | ADMIN | TECHNICIEN | CLIENT | Preconditions | Erreurs frequentes |
|---|---|---|---|---|---|---|---|
| /api/admin/technicien | POST | NON | OUI | NON | NON | accessToken role ADMIN actif + CSRF + nom/email/password/categorie valides | 400, 403, 404, 429 |
| /api/admin/assigner-ticket | PUT | NON | OUI | NON | NON | accessToken role ADMIN actif + CSRF + ticket OUVERT de cet admin + tech actif/present/categorie/capacite | 400, 403, 404, 429 |
| /api/admin/tickets | GET | NON | OUI | NON | NON | accessToken role ADMIN | 404, 429 |
| /api/admin/marquer-present/:id | PUT | NON | OUI | NON | NON | accessToken role ADMIN actif + tech gere + tech actif + CSRF | 400, 403, 404, 429 |
| /api/admin/marquer-absent/:id | PUT | NON | OUI | NON | NON | accessToken role ADMIN actif + tech gere + tech present + CSRF | 400, 403, 404, 429 |
| /api/admin/techniciens | GET | NON | OUI | NON | NON | accessToken role ADMIN | 404, 429 |
| /api/admin/desactiver/:id | PUT | NON | OUI | NON | NON | accessToken role ADMIN + tech cible gere et actif + CSRF | 400, 403, 404, 429 |
| /api/admin/reactiver/:id | PUT | NON | OUI | NON | NON | accessToken role ADMIN + tech cible gere et inactif + CSRF | 400, 403, 404, 429 |

## Endpoints Client

| Endpoint | Method | SUPER_ADMIN | ADMIN | TECHNICIEN | CLIENT | Preconditions | Erreurs frequentes |
|---|---|---|---|---|---|---|---|
| /api/client/ticket | POST | NON | NON | NON | OUI | accessToken role CLIENT actif + CSRF + SN/type/localisation valides | 400, 404, 429 |
| /api/client/tickets | GET | NON | NON | NON | OUI | accessToken role CLIENT actif | 404, 429 |

## Endpoints Technicien

| Endpoint | Method | SUPER_ADMIN | ADMIN | TECHNICIEN | CLIENT | Preconditions | Erreurs frequentes |
|---|---|---|---|---|---|---|---|
| /api/technicien/tickets | GET | NON | NON | OUI | NON | accessToken role TECHNICIEN actif | 404, 429 |
| /api/technicien/ticket/:id | PUT | NON | NON | OUI | NON | accessToken role TECHNICIEN actif + CSRF + ticket assigne + regle EN_COURS -> CLOTURE | 400, 403, 404, 429 |
| /api/technicien/historique/:sn | GET | NON | NON | OUI | NON | accessToken role TECHNICIEN actif + sn non vide | 400, 404, 429 |

## Endpoints utilisateur (profil)

| Endpoint | Method | SUPER_ADMIN | ADMIN | TECHNICIEN | CLIENT | Preconditions | Erreurs frequentes |
|---|---|---|---|---|---|---|---|
| /api/utilisateur/profil | GET | NON | OUI | OUI | OUI | accessToken actif (SUPER_ADMIN interdit) | 403, 404, 429 |
| /api/utilisateur/profil | PUT | NON | OUI | OUI | OUI | accessToken actif + CSRF + validations profil (SUPER_ADMIN interdit) | 400, 403, 404, 429 |

## Endpoints IA admin

| Endpoint | Method | SUPER_ADMIN | ADMIN | TECHNICIEN | CLIENT | Preconditions | Erreurs frequentes |
|---|---|---|---|---|---|---|---|
| /api/predict/admin | POST | NON | OUI | NON | NON | accessToken role ADMIN actif + CSRF + typeProbleme valide | 400, 401, 403, 500, 429 |

## Preconditions metier detaillees

- Admin pour assignation ticket:
  - Ticket doit appartenir a cet admin.
  - Ticket doit etre OUVERT.
  - Technicien doit etre cree par cet admin.
  - Technicien actif et marque present aujourd'hui.
  - Compatibilite categorie:
    - UGS: CONFIG_MODEM, DEBIT_FAIBLE
    - ULS: tous les autres types
  - Capacite EN_COURS:
    - UGS max 10
    - ULS max 5

- Super admin pour desactivation admin:
  - Admin cible doit etre actif.
  - Zone admin cible valide (Polygon).
  - Il faut au moins un admin actif de remplacement qui couvre la zone cible.

- Client pour creation ticket:
  - SN: 16 caracteres, majuscules/chiffres uniquement.
  - typeProbleme dans enum Ticket.
  - localisation.lat et localisation.lng requis.

## Remarques

- Les routes rolees passent toujours par authenticateToken puis authorizeRoles.
- Meme avec le bon role, un compte desactive retourne un refus.
- Les erreurs 429 peuvent apparaitre sur n'importe quelle route /api apres depassement des limites.