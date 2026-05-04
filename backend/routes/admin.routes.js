const router = require("express").Router();
const admin = require("../controllers/admin.controller");
const profile = require("../controllers/profile.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { uploadProfilePhoto } = require("../middlewares/profileUpload.middleware");

const auth = [authenticateToken, authorizeRoles("ADMIN")];

router.post("/api/admin/technicien", auth, admin.creerTechnicien);

router.put("/api/admin/assigner-ticket", auth, admin.assignerTicket);

router.get("/api/admin/tickets", auth, admin.ticketsAdmin);

// 🔹 Présence techniciens
router.put("/api/admin/marquer-present/:id", auth, admin.marquerPresent);
router.put("/api/admin/marquer-absent/:id", auth, admin.marquerAbsent);
router.get("/api/admin/techniciens", auth, admin.listerTechniciens);

// 🔹 Désactivation / Réactivation techniciens (soft delete)
//Désactivation et réactivation des techniciens par admin
router.put("/api/admin/desactiver/:id", auth, admin.desactivertechnicien);
router.put("/api/admin/reactiver/:id", auth, admin.reactivertechnicien);

router.get("/api/admin/profile", auth, profile.getProfile);
router.patch("/api/admin/profile/photo", auth, uploadProfilePhoto, profile.updateProfilePhoto);

module.exports = router;
