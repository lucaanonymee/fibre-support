const router = require("express").Router();
const admin = require("../controllers/admin.controller");
const { authenticateToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.use(authenticateToken, authorizeRoles("ADMIN"));

router.post("/api/admin/technicien", admin.creerTechnicien);

router.put("/api/admin/assigner-ticket", admin.assignerTicket);

router.get("/api/admin/tickets", admin.ticketsAdmin);

// 🔹 Présence techniciens
router.put("/api/admin/marquer-present/:id", admin.marquerPresent);
router.put("/api/admin/marquer-absent/:id", admin.marquerAbsent);
router.get("/api/admin/techniciens", admin.listerTechniciens);

// 🔹 Désactivation / Réactivation utilisateur (soft delete)
router.put("/api/admin/desactiver/:id", admin.desactiverUtilisateur);
router.put("/api/admin/reactiver/:id", admin.reactiverUtilisateur);

module.exports = router;
