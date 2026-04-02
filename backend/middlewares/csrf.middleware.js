const crypto = require("crypto");

// ═══════════════════════════════════════════════════════════════════
// 🔒 CSRF Middleware — Protection Double Submit Cookie Pattern
// ═══════════════════════════════════════════════════════════════════
// Principe :
//   1. Le serveur génère un token CSRF aléatoire et l'envoie dans un cookie NON-httpOnly
//      (pour que le frontend puisse le lire via JavaScript)
//   2. Le frontend lit ce cookie et le renvoie dans le header "X-CSRF-Token"
//   3. Le serveur compare le cookie et le header — s'ils correspondent, la requête est légitime
//   4. Un site malveillant ne peut PAS lire le cookie d'un autre domaine (Same-Origin Policy)
//      → Il ne peut donc pas forger le header → CSRF bloqué
// ═══════════════════════════════════════════════════════════════════

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

// 🔹 Générer et envoyer le token CSRF (appelé après login/refresh)
exports.generateCsrfToken = (req, res) => {
  const csrfToken = crypto.randomBytes(32).toString("hex");

  // 🔹 Cookie lisible par le frontend (NON httpOnly) mais sécurisé
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,        // Le frontend DOIT pouvoir le lire
    secure: process.env.NODE_ENV === "production", // HTTPS uniquement en prod
    sameSite: "strict",     // Ne jamais envoyer le cookie cross-site
    maxAge: 24 * 60 * 60 * 1000 // 24h
  });

  return csrfToken;
};

// 🔹 Middleware de vérification CSRF (appliqué aux routes protégées)
// Ignore les requêtes GET/HEAD/OPTIONS (elles ne modifient pas de données)
exports.verifyCsrfToken = (req, res, next) => {
  // 🔹 Les requêtes de lecture ne nécessitent pas de vérification CSRF
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  // 🔹 Vérifier que les deux tokens existent et correspondent
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "Token CSRF invalide ou manquant" });
  }

  next();
};

// 🔹 Route pour obtenir un token CSRF (GET /api/csrf-token)
exports.getCsrfToken = (req, res) => {
  const csrfToken = exports.generateCsrfToken(req, res);
  res.json({ csrfToken });
};
