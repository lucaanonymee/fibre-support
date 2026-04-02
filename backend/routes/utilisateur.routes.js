const router = require("express").Router();
const utilisateur = require("../controllers/utilisateur.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

// 🔹 Consulter profil
router.get("/api/utilisateur/profil", authenticateToken, utilisateur.getProfil);

// 🔹 Mise à jour profil
router.put("/api/utilisateur/profil", authenticateToken, utilisateur.updateProfil);

module.exports = router;
