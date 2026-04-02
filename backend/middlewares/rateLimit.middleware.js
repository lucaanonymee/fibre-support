const rateLimit = require("express-rate-limit");

// ═══════════════════════════════════════════════════════════════════
// 🔒 Rate Limiting — Protection contre l'abus d'API et brute force
// ═══════════════════════════════════════════════════════════════════
// Principe :
//   - Chaque IP a un nombre maximum de requêtes par fenêtre de temps
//   - Si dépassé → réponse 429 Too Many Requests
//   - Des limiteurs différents pour des routes différentes (login plus strict)
// ═══════════════════════════════════════════════════════════════════

// 🔹 Limiteur global — Toutes les routes API
// 100 requêtes max par IP toutes les 15 minutes
exports.globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requêtes max par IP
  message: { message: "Trop de requêtes. Réessayez dans 15 minutes." },
  standardHeaders: true,      // Retourne les headers RateLimit-* (standard IETF)
  legacyHeaders: false        // Désactive les headers X-RateLimit-* (anciens)
});

// 🔹 Limiteur strict — Login (brute force protection)
// 5 tentatives max par IP toutes les 15 minutes
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 tentatives max
  message: { message: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

// 🔹 Limiteur — Register (anti-spam création de comptes)
// 3 inscriptions max par IP toutes les 60 minutes
exports.registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 heure
  max: 3,                     // 3 inscriptions max
  message: { message: "Trop de créations de compte. Réessayez dans 1 heure." },
  standardHeaders: true,
  legacyHeaders: false
});

// 🔹 Limiteur — Mot de passe oublié / Renvoi de code (anti-spam email)
// 3 demandes max par IP toutes les 15 minutes
exports.emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 3,                     // 3 demandes max
  message: { message: "Trop de demandes. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});
