const router = require("express").Router();
const superadmin = require("../controllers/superadmin.controller");
const { authenticateToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.use(authenticateToken, authorizeRoles("SUPER_ADMIN"));

// 🔹 Note : Le Super Admin est injecté directement en base (pas de route de création)

// 🔹 Création d'un Admin (par Super Admin)
router.post("/api/superadmin/admin", superadmin.creerAdmin);

// 🔹 Lister tous les admins
router.get("/api/superadmin/admins", superadmin.listerAdmins);

// 🔹 Désactiver / Réactiver un admin
router.put("/api/superadmin/desactiver/:id", superadmin.desactiverAdmin);
router.put("/api/superadmin/reactiver/:id", superadmin.reactiverAdmin);

module.exports = router;
