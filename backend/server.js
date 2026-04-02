// backend/server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
require("dotenv").config();

// 🔹 Config DB
const connectDB = require("./config/db");

// 🔒 Middlewares de sécurité
const { globalLimiter } = require("./middlewares/rateLimit.middleware");
const { verifyCsrfToken, getCsrfToken } = require("./middlewares/csrf.middleware");

// 🔹 Routes
const authRoutes = require("./routes/auth.routes");
const superadminRoutes = require("./routes/superadmin.routes");
const adminRoutes = require("./routes/admin.routes");
const clientRoutes = require("./routes/client.routes");
const technicienRoutes = require("./routes/technicien.routes");
const utilisateurRoutes = require("./routes/utilisateur.routes");

const app = express();

// ═══════════════════════════════════════════════════════════════════
// 🔒 1. HELMET — Sécurisation des headers HTTP
// ═══════════════════════════════════════════════════════════════════
// Helmet ajoute automatiquement 15+ headers de sécurité :
//   - Content-Security-Policy : empêche le chargement de scripts/styles malveillants
//   - X-Content-Type-Options: nosniff : empêche le MIME sniffing
//   - X-Frame-Options: SAMEORIGIN : empêche le clickjacking (iframe)
//   - X-XSS-Protection : active le filtre XSS du navigateur
//   - Referrer-Policy : contrôle les infos envoyées dans le header Referer
//   - Strict-Transport-Security (HSTS) : force HTTPS (voir section 2)
app.use(helmet());

// ═══════════════════════════════════════════════════════════════════
// 🔒 2. HSTS — HTTP Strict Transport Security
// ═══════════════════════════════════════════════════════════════════
// Force le navigateur à utiliser HTTPS pendant 1 an (31536000 secondes)
// includeSubDomains : applique aussi aux sous-domaines
// Le navigateur refusera automatiquement toute connexion HTTP
app.use(helmet.hsts({
  maxAge: 31536000,           // 1 an en secondes
  includeSubDomains: true,    // Sous-domaines aussi
  preload: true               // Éligible pour la liste HSTS preload des navigateurs
}));

// ═══════════════════════════════════════════════════════════════════
// 🔒 3. CORS — Cross-Origin Resource Sharing
// ═══════════════════════════════════════════════════════════════════
// Autorise uniquement les origines connues (frontend)
// credentials: true → autorise l'envoi de cookies httpOnly cross-origin
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,          // 🔹 INDISPENSABLE pour les cookies httpOnly
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-csrf-token"]  // 🔹 Autorise le header CSRF
}));

// ═══════════════════════════════════════════════════════════════════
// 🔒 4. Cookie Parser — Lecture des cookies httpOnly
// ═══════════════════════════════════════════════════════════════════
// Nécessaire pour que req.cookies fonctionne (lire les tokens JWT)
app.use(cookieParser());

// ═══════════════════════════════════════════════════════════════════
// 🔒 5. Body Parser avec limite de taille (API abuse protection)
// ═══════════════════════════════════════════════════════════════════
// Limite le body JSON à 10 KB → empêche les payloads géants
// Un attaquant ne peut pas envoyer 100 MB de JSON pour surcharger le serveur
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// ═══════════════════════════════════════════════════════════════════
// 🔒 6. NoSQL Injection Protection
// ═══════════════════════════════════════════════════════════════════
// Supprime les opérateurs MongoDB ($gt, $ne, $or...) des requêtes
// Exemple d'attaque bloquée :
//   { "email": { "$gt": "" }, "motDePasse": { "$gt": "" } }
//   → Sans protection, cela retourne le premier utilisateur de la DB !
//   → Avec mongo-sanitize, les $ et . sont supprimés → requête inoffensive
app.use((req, res, next) => {
  // express-mongo-sanitize re-assigne req.query, ce qui casse avec Express 5.
  // On sanitize donc "in-place" les objets requis sans re-assignment.
  const options = { replaceWith: "_" };

  if (req.body && typeof req.body === "object") {
    mongoSanitize.sanitize(req.body, options);
  }
  if (req.params && typeof req.params === "object") {
    mongoSanitize.sanitize(req.params, options);
  }
  if (req.query && typeof req.query === "object") {
    mongoSanitize.sanitize(req.query, options);
  }

  next();
});

// ═══════════════════════════════════════════════════════════════════
// 🔒 7. XSS Protection (Cross-Site Scripting)
// ═══════════════════════════════════════════════════════════════════
// xss-clean re-assigne req.query et n'est pas compatible Express 5.
// On applique un nettoyage in-place pour les strings entrantes.
const sanitizeStrings = (value) => {
  if (typeof value === "string") {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeStrings);
  }

  if (value && typeof value === "object") {
    Object.keys(value).forEach((key) => {
      value[key] = sanitizeStrings(value[key]);
    });
  }

  return value;
};

app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    sanitizeStrings(req.body);
  }
  if (req.params && typeof req.params === "object") {
    sanitizeStrings(req.params);
  }
  if (req.query && typeof req.query === "object") {
    sanitizeStrings(req.query);
  }

  next();
});

// ═══════════════════════════════════════════════════════════════════
// 🔒 8. Rate Limiting global (API abuse protection)
// ═══════════════════════════════════════════════════════════════════
// 100 requêtes max par IP toutes les 15 minutes (toutes routes confondues)
// Empêche le spam, les scans automatiques et le DDoS basique
app.use("/api", globalLimiter);

// ═══════════════════════════════════════════════════════════════════
// 🔒 9. Route CSRF Token — Le frontend récupère son token ici
// ═══════════════════════════════════════════════════════════════════
// Le frontend doit appeler GET /api/csrf-token au démarrage
// puis envoyer le token dans le header "x-csrf-token" pour chaque POST/PUT/DELETE
app.get("/api/csrf-token", getCsrfToken);

// ═══════════════════════════════════════════════════════════════════
// 🔒 10. CSRF Protection — Appliquée à toutes les routes protégées
// ═══════════════════════════════════════════════════════════════════
// Vérifie que le header x-csrf-token correspond au cookie csrf-token
// Les requêtes GET/HEAD/OPTIONS sont ignorées (lecture seule)
app.use("/api", verifyCsrfToken);

// ═══════════════════════════════════════════════════════════════════
// 🔒 11. Headers de sécurité avancés (compléments Helmet)
// ═══════════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  // 🔹 Empêche le cache des réponses contenant des données sensibles
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // 🔹 Empêche la divulgation d'informations sur le serveur
  res.removeHeader("X-Powered-By");

  // 🔹 Permissions-Policy : désactive les APIs navigateur inutiles
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

  next();
});

// 🔹 Routes test
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend connecté avec succès 🚀" });
});

app.get("/", (req, res) => {
  res.send("Backend is running");
});

// 🔹 Routes principales
app.use(authRoutes);          // login / register client
app.use(superadminRoutes);    // création admin (par super admin)
app.use(adminRoutes);         // création technicien + gestion tickets
app.use(clientRoutes);        // tickets client
app.use(technicienRoutes);    // tickets technicien
app.use(utilisateurRoutes);   // profil utilisateur

// 🔹 Route 404 - Endpoint non trouvé
app.use((req, res) => {
  res.status(404).json({ message: "Route non trouvée" });
});

// 🔹 Middleware global de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error("Erreur serveur:", err.stack);
  res.status(500).json({ message: "Erreur interne du serveur" });
});

// ═══════════════════════════════════════════════════════════════════
// 🔒 12. HTTPS / TLS — En production, utiliser un reverse proxy (Nginx)
// ═══════════════════════════════════════════════════════════════════
// En développement : HTTP simple (localhost)
// En production : Nginx/Apache gère le certificat SSL et proxy vers Express
// Le HSTS (section 2) force le navigateur à toujours utiliser HTTPS
//
// Alternative Node.js natif (si pas de reverse proxy) :
//   const https = require("https");
//   const fs = require("fs");
//   const options = {
//     key: fs.readFileSync("./certs/privkey.pem"),
//     cert: fs.readFileSync("./certs/fullchain.pem")
//   };
//   https.createServer(options, app).listen(443);
// ═══════════════════════════════════════════════════════════════════

// 🔹 Connexion MongoDB + lancement serveur
connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () => {
    console.log(`Serveur lancé sur http://localhost:${process.env.PORT || 5000}`);
    console.log("🔒 Sécurité : Helmet, HSTS, CORS, CSRF, Rate Limit, XSS, NoSQL Sanitize activés");
  });
});
