const router = require("express").Router();
const utilisateur = require("../controllers/utilisateur.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

router.use(authenticateToken);

// 🔹 Consulter profil
router.get("/api/utilisateur/profil", utilisateur.getProfil);

// 🔹 Mise à jour profil
router.put("/api/utilisateur/profil", utilisateur.updateProfil);

module.exports = router;
