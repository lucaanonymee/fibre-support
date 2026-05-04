# Diagrammes de sequence complets

Ce document decrit les flux backend acteur par acteur selon le code actuel.

## Legende

- Toutes les routes /api en POST/PUT/DELETE exigent x-csrf-token.
- Les routes protegees exigent le cookie accessToken (JWT).
- Les codes d'erreur les plus frequents sont notes dans les branches alt.

## Pipeline de securite (toutes requetes /api)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FE as Frontend/Postman
    participant API as Express API

    U->>FE: Action utilisateur
    FE->>API: Requete HTTP
    API->>API: Helmet + HSTS + CORS + Body limit
    API->>API: Sanitize NoSQL + sanitize strings
    API->>API: Global rate limiter /api

    alt Methode GET/HEAD/OPTIONS
        API-->>FE: Continue sans check CSRF
    else Methode POST/PUT/DELETE
        API->>API: verifyCsrfToken(cookie csrf-token == header x-csrf-token)
        alt Token CSRF manquant ou invalide
            API-->>FE: 403 Token CSRF invalide ou manquant
        else Token CSRF valide
            API-->>FE: Continue vers route metier
        end
    end
```

## Acteur 1: Super Admin

```mermaid
sequenceDiagram
    autonumber
    actor SA as Super Admin
    participant FE as Frontend/Postman
    participant API as Backend API
    participant DB as MongoDB
    participant Mail as Email Service

    SA->>FE: Ouvrir session
    FE->>API: GET /api/csrf-token
    API-->>FE: 200 { csrfToken } + cookie csrf-token

    FE->>API: POST /api/login (email, motDePasse)
    API->>DB: find user by email
    API->>DB: compare bcrypt + checks isActive/role/emailVerifie
    alt Login invalide
        API-->>FE: 400/401/403
    else Login OK
        API-->>FE: 200 + cookies accessToken/refreshToken
    end

    SA->>FE: Creer un admin
    FE->>API: POST /api/superadmin/admin
    API->>DB: verify req.user role SUPER_ADMIN
    API->>DB: checks champs + unicite nom/email + password + zoneIntervention
    alt Validation echoue
        API-->>FE: 400/403
    else Validation OK
        API->>DB: create ADMIN
        API->>Mail: envoyerEmailBienvenueCompte(role ADMIN)
        API-->>FE: 201 Admin cree
    end

    SA->>FE: Lister admins
    FE->>API: GET /api/superadmin/admins
    API->>DB: find admins
    API-->>FE: 200 liste admins

    SA->>FE: Desactiver un admin
    FE->>API: PUT /api/superadmin/desactiver/:id
    API->>DB: start transaction
    API->>DB: verify super admin actif + admin cible actif
    API->>DB: trouver admin remplacant couvrant la zone
    alt Aucun remplacant
        API-->>FE: 400 NO_REPLACEMENT_ADMIN
    else Remplacant trouve
        API->>DB: transferer techniciens vers remplacant
        API->>DB: transferer tickets OUVERT/EN_COURS
        API->>DB: admin cible isActive=false + refreshToken=null
        API-->>FE: 200 desactivation + compteurs transferts
    end

    SA->>FE: Reactiver admin
    FE->>API: PUT /api/superadmin/reactiver/:id
    API->>DB: admin.isActive=true
    alt Admin deja actif ou introuvable
        API-->>FE: 400/404
    else Reactivation OK
        API-->>FE: 200 admin reactive
    end
```

## Acteur 2: Admin

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant FE as Frontend/Postman
    participant API as Backend API
    participant DB as MongoDB
    participant Mail as Email Service

    A->>FE: Login admin
    FE->>API: GET /api/csrf-token
    FE->>API: POST /api/login
    API-->>FE: 200 + cookies JWT

    A->>FE: Creer technicien
    FE->>API: POST /api/admin/technicien
    API->>DB: verify admin actif
    API->>DB: checks nom/email/password/categorie UGS|ULS
    alt Validation echoue
        API-->>FE: 400/403/404
    else Validation OK
        API->>DB: create TECHNICIEN (zone heritee)
        API->>Mail: envoyerEmailBienvenueCompte(role TECHNICIEN)
        API-->>FE: 201 technicien cree
    end

    A->>FE: Marquer technicien present
    FE->>API: PUT /api/admin/marquer-present/:techId
    API->>DB: verify admin + tech manage + tech actif
    alt Tech deja present ou non gere
        API-->>FE: 400/403
    else OK
        API->>DB: estPresent=true, datePresence=now
        API-->>FE: 200
    end

    A->>FE: Assigner ticket
    FE->>API: PUT /api/admin/assigner-ticket
    API->>DB: verify admin actif
    API->>DB: find ticket by _id or TT-x
    API->>DB: checks ticket appartient admin + statut OUVERT
    API->>DB: checks tech role/ownership/actif/present/categorie/capacite
    alt Regle metier violee
        API-->>FE: 400/403/404
    else OK
        API->>DB: ticket.statut=EN_COURS + assignationDate
        API-->>FE: 200 ticket assigne
    end

    A->>FE: Voir tickets admin
    FE->>API: GET /api/admin/tickets
    API->>DB: find tickets par admin
    API->>API: recalcule aiScore/priorite dynamique
    API->>DB: bulkWrite si changements IA
    alt Aucun ticket
        API-->>FE: 404
    else OK
        API-->>FE: 200 liste tickets
    end

    A->>FE: Desactiver technicien
    FE->>API: PUT /api/admin/desactiver/:techId
    API->>DB: start transaction
    API->>DB: checks tech existe + role TECHNICIEN + ownership + actif
    API->>DB: reouvrir tickets EN_COURS du tech (-> OUVERT)
    API->>DB: tech isActive=false, estPresent=false, refreshToken=null
    API-->>FE: 200 + ticketsRouverts

    A->>FE: Reactiver technicien
    FE->>API: PUT /api/admin/reactiver/:techId
    API->>DB: checks role/ownership/inactive
    alt Deja actif ou invalide
        API-->>FE: 400/403/404
    else OK
        API-->>FE: 200 tech reactive
    end
```

## Acteur 3: Client

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant FE as Frontend/Postman
    participant API as Backend API
    participant DB as MongoDB
    participant PY as Python IA
    participant Mail as Email Service

    C->>FE: Creer compte
    FE->>API: GET /api/csrf-token
    FE->>API: POST /api/register
    API->>DB: validate nom/email/password/telephone
    API->>DB: create CLIENT
    API->>DB: save codeVerification (10 min)
    API->>Mail: envoyerCodeVerification
    alt Validation echoue
        API-->>FE: 400
    else OK
        API-->>FE: 201 compte cree
    end

    C->>FE: Verifier email
    FE->>API: POST /api/verifier-email
    API->>DB: verify code + expiration
    alt Code invalide/expire
        API-->>FE: 400
    else OK
        API->>DB: emailVerifie=true
        API-->>FE: 200
    end

    C->>FE: Login client
    FE->>API: POST /api/login
    API->>DB: check password + isActive + emailVerifie
    alt Email non verifie
        API-->>FE: 403
    else OK
        API-->>FE: 200 + cookies JWT
    end

    C->>FE: Creer ticket
    FE->>API: POST /api/client/ticket
    API->>DB: validate SN/type/localisation
    API->>DB: trouver admin actif couvrant zone
    alt Aucun admin couvrant
        API-->>FE: 404
    else Admin trouve
        API->>DB: calcul charge admin + choix moins charge
        API->>PY: runPythonPrediction(type, load, creationDate)
        alt IA indisponible
            API->>API: log erreur, continuer sans bloquer
        end
        API->>DB: create ticket statut OUVERT + ticketRef TT-x
        API-->>FE: 201 ticket cree (champs IA masques client)
    end

    C->>FE: Consulter mes tickets
    FE->>API: GET /api/client/tickets
    API->>DB: find tickets client
    alt Aucun ticket
        API-->>FE: 404
    else OK
        API-->>FE: 200 tickets (champs IA masques)
    end

    C->>FE: Mot de passe oublie
    FE->>API: POST /api/mot-de-passe-oublie
    API->>DB: check compte actif non SUPER_ADMIN
    API->>DB: save code reset
    API->>Mail: envoyerCodeResetPassword
    API-->>FE: 200

    FE->>API: POST /api/verifier-code-reset
    API->>DB: verify code reset non expire
    API-->>FE: 200

    FE->>API: POST /api/reset-mot-de-passe
    API->>DB: verify codeResetVerifie + nouveau mdp
    API->>DB: save nouveau mdp
    API-->>FE: 200
```

## Acteur 4: Technicien

```mermaid
sequenceDiagram
    autonumber
    actor T as Technicien
    participant FE as Frontend/Postman
    participant API as Backend API
    participant DB as MongoDB
    participant Mail as Email Service

    T->>FE: Login technicien
    FE->>API: GET /api/csrf-token
    FE->>API: POST /api/login
    API-->>FE: 200 + cookies JWT

    T->>FE: Voir tickets assignes
    FE->>API: GET /api/technicien/tickets
    API->>DB: find tickets by technicienId
    alt Aucun ticket
        API-->>FE: 404
    else OK
        API-->>FE: 200 tickets tries assignationDate
    end

    T->>FE: Cloturer ticket EN_COURS
    FE->>API: PUT /api/technicien/ticket/:id
    API->>DB: find ticket by _id or TT-x
    API->>DB: check ownership (ticket.technicienId == req.user.id)
    alt Ticket OUVERT
        API-->>FE: 403 ticket doit etre assigne par admin
    else Ticket CLOTURE
        API-->>FE: 400 deja cloture
    else Ticket EN_COURS + statut recu != CLOTURE
        API-->>FE: 400 action non autorisee
    else OK
        API->>DB: ticket.statut=CLOTURE + clotureDate
        API->>Mail: envoyerEmailClotureTicket(client)
        API-->>FE: 200 ticket cloture
    end

    T->>FE: Historique par SN
    FE->>API: GET /api/technicien/historique/:sn
    API->>DB: find tickets by SN
    alt Aucun resultat
        API-->>FE: 404
    else OK
        API-->>FE: 200 historique
    end
```

## Notes d'execution

- Le refresh token est limite au path /api/refresh-token.
- Le backend masque les champs IA pour CLIENT et TECHNICIEN.
- La desactivation admin et technicien utilise des transactions MongoDB.
