const router = require("express").Router();
const profile = require("../controllers/profile.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

// 🔹 Consulter profil
router.get("/api/utilisateur/profil", authenticateToken, profile.getProfil);

// 🔹 Mise à jour profil
router.put("/api/utilisateur/profil", authenticateToken, profile.updateProfil);

module.exports = router;
