const rateLimit = require("express-rate-limit");

const normalizeEmail = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();
  if (!email) {
    return null;
  }

  return email;
};

const extractEmailFromRequest = (req) => {
  return (
    normalizeEmail(req.body?.email)
    || normalizeEmail(req.body?.ancienEmail)
    || normalizeEmail(req.body?.nouvelEmail)
  );
};

const makeEmailKeyGenerator = (prefix) => {
  return (req) => {
    const email = extractEmailFromRequest(req);
    if (email) {
      return `${prefix}:email:${email}`;
    }

    return `${prefix}:ip:${rateLimit.ipKeyGenerator(req.ip)}`;
  };
};

// ═══════════════════════════════════════════════════════════════════
// 🔒 Rate Limiting — Protection contre l'abus d'API et brute force
// ═══════════════════════════════════════════════════════════════════
// Principe :
//   - Chaque IP a un nombre maximum de requêtes par fenêtre de temps
//   - Si dépassé → réponse 429 Too Many Requests
//   - Des limiteurs différents pour des routes différentes (login plus strict)
// ═══════════════════════════════════════════════════════════════════

// 🔹 Limiteur global — Toutes les routes API
// 150 requêtes max par IP toutes les 15 minutes
exports.globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 150,                   // 150 requêtes max par IP
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

// 🔹 Limiteur par email — Login (en plus de l'IP)
exports.loginEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,
  keyGenerator: makeEmailKeyGenerator("login"),
  message: { message: "Trop de tentatives pour cet email. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

// 🔹 Limiteur par email — Register (en plus de l'IP)
exports.registerEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 heure
  max: 3,
  keyGenerator: makeEmailKeyGenerator("register"),
  message: { message: "Trop de créations de compte pour cet email. Réessayez dans 1 heure." },
  standardHeaders: true,
  legacyHeaders: false
});

// 🔹 Limiteur par email — Renvoi/oubli code (en plus de l'IP)
exports.emailPerAddressLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 3,
  keyGenerator: makeEmailKeyGenerator("email-action"),
  message: { message: "Trop de demandes pour cet email. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

// 🔹 Limiteur par email — Verification de code (anti brute force)
exports.codeVerificationEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  keyGenerator: makeEmailKeyGenerator("code-verify"),
  message: { message: "Trop de tentatives de code pour cet email. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});
