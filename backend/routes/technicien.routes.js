const router = require("express").Router();
const tech = require("../controllers/technicien.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

const auth = [authenticateToken, authorizeRoles("TECHNICIEN")];

// Voir tickets assignés
router.get("/api/technicien/tickets", auth, tech.ticketsAssignes);

// Mettre à jour statut
router.put("/api/technicien/ticket/:id", auth, tech.mettreAJourTicket);

// 🔹 Historique des tickets par SN
router.get("/api/technicien/historique/:sn", auth, tech.historiqueBySN);

module.exports = router;

