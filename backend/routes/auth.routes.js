const router = require("express").Router();
const auth = require("../controllers/auth.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

// 🔒 Rate Limiters — Protection brute force et spam
const {
	loginLimiter,
	registerLimiter,
	emailLimiter,
	loginEmailLimiter,
	registerEmailLimiter,
	emailPerAddressLimiter,
	codeVerificationEmailLimiter,
} = require("../middlewares/rateLimit.middleware");

// 🔒 loginLimiter : 5 tentatives max / 15 min (brute force protection)
router.post("/api/login", loginLimiter, loginEmailLimiter, auth.login);

// 🔒 registerLimiter : 3 inscriptions max / 1 heure (anti-spam)
router.post("/api/register", registerLimiter, registerEmailLimiter, auth.registerClient);

// 🔹 Vérification email
router.post("/api/verifier-email", codeVerificationEmailLimiter, auth.verifierEmail);

// 🔒 emailLimiter : 3 demandes max / 15 min (anti-spam email)
router.post("/api/renvoyer-code", emailLimiter, emailPerAddressLimiter, auth.renvoyerCode);
router.put("/api/modifier-email", emailPerAddressLimiter, auth.modifierEmail);

// 🔹 Mot de passe oublié
// 🔒 emailLimiter : limite les demandes de code par email
router.post("/api/mot-de-passe-oublie", emailLimiter, emailPerAddressLimiter, auth.motDePasseOublie);
router.post("/api/verifier-code-reset", codeVerificationEmailLimiter, auth.verifierCodeReset);
router.post("/api/reset-mot-de-passe", auth.resetMotDePasse);

// 🔹 Refresh Token & Logout
router.post("/api/refresh-token", auth.refreshToken);
router.post("/api/logout", auth.logout);
router.get("/api/me", authenticateToken, auth.me);

module.exports = router;
