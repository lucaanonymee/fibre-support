# Checklist Postman prete a executer (avec cas d'erreur)

Ce document fournit:

- un setup Postman standard pour ton backend,
- un ordre d'execution,
- une checklist de tests avec codes attendus,
- les preconditions pour couvrir aussi les erreurs rares.

## 1) Setup Postman

## 1.1 Variables d'environnement recommandees

Creer un environment Postman, puis ajouter:

- baseUrl = http://localhost:5000
- csrfToken = (vide au debut)
- superAdminEmail = (a renseigner)
- superAdminPassword = (a renseigner)
- adminEmail = (a renseigner)
- adminPassword = (a renseigner)
- admin2Email = (a renseigner pour tests de transfert)
- admin2Password = (a renseigner)
- clientEmail = (a renseigner)
- clientPassword = (a renseigner)
- techEmail = (a renseigner)
- techPassword = (a renseigner)
- unverifiedClientEmail = (a renseigner)
- unverifiedClientPassword = (a renseigner)
- adminId = (vide au debut)
- admin2Id = (vide au debut)
- techId = (vide au debut)
- clientId = (vide au debut)
- ticketId = (vide au debut)
- ticketRef = (vide au debut)
- resetCode = (optionnel si recupere manuellement)
- verifyCode = (optionnel si recupere manuellement)

## 1.2 Request de base a creer en premier

Nom: CSRF - Get token

- Method: GET
- URL: {{baseUrl}}/api/csrf-token

Tests script:

```javascript
pm.test("status 200", () => pm.response.code === 200);
const data = pm.response.json();
pm.environment.set("csrfToken", data.csrfToken);
```

## 1.3 Script pre-request au niveau Collection

Ajouter ce script au niveau Collection pour injecter automatiquement le header CSRF:

```javascript
const unsafeMethods = ["POST", "PUT", "DELETE", "PATCH"];
if (unsafeMethods.includes(pm.request.method)) {
  const csrf = pm.environment.get("csrfToken");
  if (csrf) {
    pm.request.headers.upsert({ key: "x-csrf-token", value: csrf });
  }
}
```

## 1.4 Notes cookies

- Postman gere automatiquement les cookies si cookie jar active.
- Ton backend utilise accessToken et refreshToken en httpOnly cookies.

## 2) Ordre d'execution conseille

1. CSRF - Get token
2. Auth public (register/verify/login)
3. Super Admin -> creation admins
4. Admin -> creation techniciens
5. Client -> creation tickets
6. Admin -> assignation tickets
7. Technicien -> cloture ticket
8. Profil + IA + desactivation/reactivation

## 3) Checklist de tests

Convention:

- [ ] signifie test a executer.
- Expected contient le code HTTP principal attendu.

## 3.1 Securite globale et limites

- [ ] SEC-01 POST sans x-csrf-token vers /api/login -> Expected 403
- [ ] SEC-02 POST avec x-csrf-token faux vers /api/login -> Expected 403
- [ ] SEC-03 Flood /api/test >100 req/15min -> Expected 429
- [ ] SEC-04 Flood /api/login >5 req/15min -> Expected 429
- [ ] SEC-05 Flood /api/register >3 req/1h -> Expected 429
- [ ] SEC-06 Flood /api/renvoyer-code >3 req/15min -> Expected 429

## 3.2 Auth: login, refresh, logout

- [ ] AUTH-01 login champs manquants -> POST /api/login, body vide -> Expected 400
- [ ] AUTH-02 login email inconnu -> Expected 401
- [ ] AUTH-03 login mauvais mot de passe -> Expected 401
- [ ] AUTH-04 login compte desactive -> Expected 403
- [ ] AUTH-05 login client non verifie -> Expected 403
- [ ] AUTH-06 login valide -> Expected 200

- [ ] AUTH-07 refresh sans cookie refreshToken -> POST /api/refresh-token -> Expected 400
- [ ] AUTH-08 refresh token invalide/expire -> Expected 401
- [ ] AUTH-09 refresh token mismatch DB -> Expected 401
- [ ] AUTH-10 refresh compte desactive -> Expected 403
- [ ] AUTH-11 refresh valide -> Expected 200

- [ ] AUTH-12 logout sans cookie (mais avec CSRF) -> POST /api/logout -> Expected 200
- [ ] AUTH-13 logout sans CSRF -> Expected 403
- [ ] AUTH-14 logout valide -> Expected 200

## 3.3 Register client + verification email

- [ ] REG-01 register champs manquants -> POST /api/register -> Expected 400
- [ ] REG-02 register email invalide -> Expected 400
- [ ] REG-03 register numTelephone invalide -> Expected 400
- [ ] REG-04 register email deja utilise -> Expected 400
- [ ] REG-05 register nom deja pris -> Expected 400
- [ ] REG-06 register mot de passe faible -> Expected 400
- [ ] REG-07 register valide -> Expected 201

- [ ] VER-01 verifier-email email/code manquants -> POST /api/verifier-email -> Expected 400
- [ ] VER-02 verifier-email user introuvable -> Expected 404
- [ ] VER-03 verifier-email deja verifie -> Expected 400
- [ ] VER-04 verifier-email code incorrect -> Expected 400
- [ ] VER-05 verifier-email code expire -> Expected 400
- [ ] VER-06 verifier-email valide -> Expected 200

- [ ] RNV-01 renvoyer-code email manquant -> POST /api/renvoyer-code -> Expected 400
- [ ] RNV-02 renvoyer-code user introuvable -> Expected 404
- [ ] RNV-03 renvoyer-code email deja verifie -> Expected 400
- [ ] RNV-04 renvoyer-code valide -> Expected 200

- [ ] MME-01 modifier-email champs manquants -> PUT /api/modifier-email -> Expected 400
- [ ] MME-02 modifier-email ancien == nouveau -> Expected 400
- [ ] MME-03 modifier-email nouvel email invalide -> Expected 400
- [ ] MME-04 modifier-email compte introuvable/deja verifie -> Expected 404
- [ ] MME-05 modifier-email nouvel email deja utilise -> Expected 400
- [ ] MME-06 modifier-email valide -> Expected 200

## 3.4 Mot de passe oublie

- [ ] MDP-01 oublie email manquant -> POST /api/mot-de-passe-oublie -> Expected 400
- [ ] MDP-02 oublie email invalide -> Expected 400
- [ ] MDP-03 oublie compte introuvable -> Expected 404
- [ ] MDP-04 oublie role SUPER_ADMIN -> Expected 403
- [ ] MDP-05 oublie compte desactive -> Expected 403
- [ ] MDP-06 oublie valide -> Expected 200

- [ ] VCR-01 verifier-code-reset champs manquants -> POST /api/verifier-code-reset -> Expected 400
- [ ] VCR-02 verifier-code-reset code incorrect/expire -> Expected 400
- [ ] VCR-03 verifier-code-reset valide -> Expected 200

- [ ] RMP-01 reset mot de passe champs manquants -> POST /api/reset-mot-de-passe -> Expected 400
- [ ] RMP-02 reset mot de passe confirmation differente -> Expected 400
- [ ] RMP-03 reset mot de passe trop faible -> Expected 400
- [ ] RMP-04 reset sans process valide -> Expected 400
- [ ] RMP-05 reset meme mot de passe que l'ancien -> Expected 400
- [ ] RMP-06 reset valide -> Expected 200

## 3.5 Super Admin

- [ ] SA-01 creer admin sans role SUPER_ADMIN -> POST /api/superadmin/admin -> Expected 403
- [ ] SA-02 creer admin super admin desactive -> Expected 403
- [ ] SA-03 creer admin champs manquants -> Expected 400
- [ ] SA-04 creer admin email invalide -> Expected 400
- [ ] SA-05 creer admin email deja utilise -> Expected 400
- [ ] SA-06 creer admin nom deja pris -> Expected 400
- [ ] SA-07 creer admin mot de passe faible -> Expected 400
- [ ] SA-08 creer admin zoneIntervention manquante -> Expected 400
- [ ] SA-09 creer admin valide -> Expected 201

- [ ] SA-10 lister admins sans role SUPER_ADMIN -> GET /api/superadmin/admins -> Expected 403
- [ ] SA-11 lister admins valide -> Expected 200

- [ ] SA-12 desactiver admin sans role SUPER_ADMIN -> PUT /api/superadmin/desactiver/:id -> Expected 403
- [ ] SA-13 desactiver admin super admin desactive -> Expected 403
- [ ] SA-14 desactiver admin introuvable -> Expected 404
- [ ] SA-15 desactiver admin deja desactive -> Expected 400
- [ ] SA-16 desactiver admin zone invalide -> Expected 400
- [ ] SA-17 desactiver admin sans remplacant couvrant zone -> Expected 400
- [ ] SA-18 desactiver admin valide (avec transferts) -> Expected 200

- [ ] SA-19 reactiver admin sans role SUPER_ADMIN -> PUT /api/superadmin/reactiver/:id -> Expected 403
- [ ] SA-20 reactiver admin introuvable -> Expected 404
- [ ] SA-21 reactiver admin deja actif -> Expected 400
- [ ] SA-22 reactiver admin valide -> Expected 200

## 3.6 Admin: techniciens, presence, tickets

- [ ] AD-01 creer technicien champs manquants -> POST /api/admin/technicien -> Expected 400
- [ ] AD-02 creer technicien admin introuvable -> Expected 404
- [ ] AD-03 creer technicien admin desactive -> Expected 403
- [ ] AD-04 creer technicien email deja utilise -> Expected 400
- [ ] AD-05 creer technicien nom deja pris -> Expected 400
- [ ] AD-06 creer technicien mot de passe faible -> Expected 400
- [ ] AD-07 creer technicien categorie invalide/absente -> Expected 400
- [ ] AD-08 creer technicien valide -> Expected 201

- [ ] AD-09 marquer present admin introuvable -> PUT /api/admin/marquer-present/:id -> Expected 404
- [ ] AD-10 marquer present admin desactive -> Expected 403
- [ ] AD-11 marquer present technicien introuvable -> Expected 404
- [ ] AD-12 marquer present technicien non gere -> Expected 403
- [ ] AD-13 marquer present technicien desactive -> Expected 400
- [ ] AD-14 marquer present deja present -> Expected 400
- [ ] AD-15 marquer present valide -> Expected 200

- [ ] AD-16 marquer absent admin introuvable -> PUT /api/admin/marquer-absent/:id -> Expected 404
- [ ] AD-17 marquer absent admin desactive -> Expected 403
- [ ] AD-18 marquer absent technicien introuvable -> Expected 404
- [ ] AD-19 marquer absent technicien non gere -> Expected 403
- [ ] AD-20 marquer absent technicien pas present -> Expected 400
- [ ] AD-21 marquer absent valide -> Expected 200

- [ ] AD-22 lister techniciens admin introuvable -> GET /api/admin/techniciens -> Expected 404
- [ ] AD-23 lister techniciens valide -> Expected 200
- [ ] AD-24 lister techniciens filtre present=true -> Expected 200
- [ ] AD-25 lister techniciens filtre present=false -> Expected 200

- [ ] AD-26 assigner ticket acces admin invalide -> PUT /api/admin/assigner-ticket -> Expected 403
- [ ] AD-27 assigner ticket introuvable -> Expected 404
- [ ] AD-28 assigner ticket non gere par admin -> Expected 403
- [ ] AD-29 assigner ticket statut != OUVERT -> Expected 400
- [ ] AD-30 assigner technicien invalide -> Expected 400
- [ ] AD-31 assigner technicien non gere par admin -> Expected 403
- [ ] AD-32 assigner technicien desactive -> Expected 400
- [ ] AD-33 assigner technicien absent -> Expected 400
- [ ] AD-34 assigner categorie incompatible -> Expected 400
- [ ] AD-35 assigner capacite max atteinte -> Expected 400
- [ ] AD-36 assigner valide -> Expected 200

- [ ] AD-37 tickets admin aucun ticket -> GET /api/admin/tickets -> Expected 404
- [ ] AD-38 tickets admin valide -> Expected 200

- [ ] AD-39 desactiver technicien user introuvable -> PUT /api/admin/desactiver/:id -> Expected 404
- [ ] AD-40 desactiver technicien role non TECHNICIEN -> Expected 403
- [ ] AD-41 desactiver technicien non gere -> Expected 403
- [ ] AD-42 desactiver technicien deja desactive -> Expected 400
- [ ] AD-43 desactiver technicien valide -> Expected 200

- [ ] AD-44 reactiver technicien user introuvable -> PUT /api/admin/reactiver/:id -> Expected 404
- [ ] AD-45 reactiver technicien role non TECHNICIEN -> Expected 403
- [ ] AD-46 reactiver technicien non gere -> Expected 403
- [ ] AD-47 reactiver technicien deja actif -> Expected 400
- [ ] AD-48 reactiver technicien valide -> Expected 200

## 3.7 Client tickets

- [ ] CL-01 creer ticket champs manquants -> POST /api/client/ticket -> Expected 400
- [ ] CL-02 creer ticket SN invalide -> Expected 400
- [ ] CL-03 creer ticket aucune zone admin couverte -> Expected 404
- [ ] CL-04 creer ticket plage ticketRef epuisee (test de charge specifique) -> Expected 400
- [ ] CL-05 creer ticket valide -> Expected 201

- [ ] CL-06 consulter tickets aucun ticket -> GET /api/client/tickets -> Expected 404
- [ ] CL-07 consulter tickets valide -> Expected 200

## 3.8 Technicien tickets

- [ ] TC-01 lister tickets assignes vide -> GET /api/technicien/tickets -> Expected 404
- [ ] TC-02 lister tickets assignes valide -> Expected 200

- [ ] TC-03 update ticket introuvable -> PUT /api/technicien/ticket/:id -> Expected 404
- [ ] TC-04 update ticket non assigne a ce technicien -> Expected 403
- [ ] TC-05 update ticket deja cloture -> Expected 400
- [ ] TC-06 update ticket statut OUVERT -> Expected 403
- [ ] TC-07 update ticket EN_COURS avec statut != CLOTURE -> Expected 400
- [ ] TC-08 update ticket valide EN_COURS -> CLOTURE -> Expected 200

- [ ] TC-09 historique sn manquant -> GET /api/technicien/historique/:sn -> Expected 400
- [ ] TC-10 historique sn sans resultat -> Expected 404
- [ ] TC-11 historique sn valide -> Expected 200

## 3.9 Profil utilisateur

- [ ] PR-01 GET profil sans token -> GET /api/utilisateur/profil -> Expected 401
- [ ] PR-02 GET profil token invalide/expire -> Expected 401
- [ ] PR-03 GET profil compte desactive -> Expected 403
- [ ] PR-04 GET profil role SUPER_ADMIN -> Expected 403
- [ ] PR-05 GET profil user introuvable -> Expected 404
- [ ] PR-06 GET profil valide (ADMIN/TECH/CLIENT) -> Expected 200

- [ ] PR-07 PUT profil SUPER_ADMIN -> PUT /api/utilisateur/profil -> Expected 403
- [ ] PR-08 PUT profil user introuvable -> Expected 404
- [ ] PR-09 PUT profil compte desactive -> Expected 403
- [ ] PR-10 PUT profil nom deja pris -> Expected 400
- [ ] PR-11 PUT profil email invalide -> Expected 400
- [ ] PR-12 PUT profil email deja utilise -> Expected 400
- [ ] PR-13 PUT profil mot de passe faible -> Expected 400
- [ ] PR-14 PUT profil meme mot de passe -> Expected 400
- [ ] PR-15 PUT profil numTelephone invalide (CLIENT) -> Expected 400
- [ ] PR-16 PUT profil valide -> Expected 200

## 3.10 IA

- [ ] IA-01 endpoint public desactive -> POST /api/predict -> Expected 410
- [ ] IA-02 predict/admin sans auth -> POST /api/predict/admin -> Expected 401
- [ ] IA-03 predict/admin mauvais role -> Expected 403
- [ ] IA-04 predict/admin typeProbleme manquant -> Expected 400
- [ ] IA-05 predict/admin typeProbleme invalide -> Expected 400
- [ ] IA-06 predict/admin creationDate invalide -> Expected 400
- [ ] IA-07 predict/admin reponse IA invalide (fault injection) -> Expected 500
- [ ] IA-08 predict/admin valide -> Expected 200

## 4) Jeux de donnees minimaux pour couvrir toutes les erreurs

Pour une couverture large, prevois:

- 1 SUPER_ADMIN actif
- 2 ADMIN actifs avec zones qui se recouvrent partiellement
- 1 ADMIN desactive
- 2 TECHNICIEN pour un meme admin (UGS, ULS)
- 1 TECHNICIEN desactive
- 1 CLIENT verifie
- 1 CLIENT non verifie
- au moins 1 ticket OUVERT, 1 EN_COURS, 1 CLOTURE

## 5) Cas rares et comment les provoquer

- SA-17 (pas de remplacant admin): cree une zone admin isolee sans autre admin couvrant la zone.
- AD-35 (capacite max): creer 10 tickets EN_COURS sur un UGS, puis tenter une 11e assignation.
- CL-04 (ticketRef epuisee): test de charge artificiel en forcant Counter.seq a 9999999.
- IA-07 (reponse IA invalide): injecter une panne python (PYTHON_BIN incorrect) ou script IA qui retourne un JSON non conforme.

## 6) Templates payloads rapides

Login:

```json
{
  "email": "user@example.com",
  "motDePasse": "P@ssw0rd!"
}
```

Register client:

```json
{
  "nom": "client_demo",
  "email": "client_demo@example.com",
  "motDePasse": "Client@123",
  "numTelephone": "12345678"
}
```

Create admin (super admin):

```json
{
  "nom": "admin_demo",
  "email": "admin_demo@example.com",
  "motDePasse": "Admin@123",
  "zoneIntervention": {
    "type": "Polygon",
    "coordinates": [[[10.15,36.78],[10.25,36.78],[10.25,36.88],[10.15,36.88],[10.15,36.78]]]
  }
}
```

Create technicien (admin):

```json
{
  "nom": "tech_demo",
  "email": "tech_demo@example.com",
  "motDePasse": "Tech@123",
  "categorie": "UGS"
}
```

Create ticket (client):

```json
{
  "sn": "AB12CD34EF56GH78",
  "typeProbleme": "CONFIG_MODEM",
  "description": "Perte de config",
  "localisation": { "lat": 36.82, "lng": 10.20 }
}
```

Assign ticket (admin):

```json
{
  "ticketId": "TT-1",
  "technicienId": "{{techId}}"
}
```

Close ticket (technicien):

```json
{
  "statut": "CLOTURE"
}
```

## 7) Critere de sortie (Definition of Done)

Checklist consideree complete si:

- Tous les tests critiques SEC/AUTH/ROLE passent,
- Les chemins metier principaux passent (create -> assign -> close),
- Les erreurs metier majeures retournent le code attendu,
- Les routes sensibles refusent les mauvais roles,
- Les routes state-changing refusent sans CSRF.
