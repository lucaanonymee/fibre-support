const router = require("express").Router();
const tech = require("../controllers/technicien.controller");
const { authenticateToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.use(authenticateToken, authorizeRoles("TECHNICIEN"));

// Voir tickets assignés
router.get("/api/technicien/tickets", tech.ticketsAssignes);

// Mettre à jour statut
router.put("/api/technicien/ticket/:id", tech.mettreAJourTicket);

// 🔹 Historique des tickets par SN
router.get("/api/technicien/historique/:sn", tech.historiqueBySN);

module.exports = router;

