const router = require("express").Router();
const auth = require("../controllers/auth.controller");

router.post("/api/register", auth.registerClient);
router.post("/api/login", auth.login);

// 🔹 Vérification email
router.post("/api/verifier-email", auth.verifierEmail);
router.post("/api/renvoyer-code", auth.renvoyerCode);

// 🔹 Mot de passe oublié
router.post("/api/mot-de-passe-oublie", auth.motDePasseOublie);
router.post("/api/verifier-code-reset", auth.verifierCodeReset);
router.post("/api/reset-mot-de-passe", auth.resetMotDePasse);

module.exports = router;
