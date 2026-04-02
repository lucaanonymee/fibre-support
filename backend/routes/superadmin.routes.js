const router = require("express").Router();
const superadmin = require("../controllers/superadmin.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

const auth = [authenticateToken, authorizeRoles("SUPER_ADMIN")];

// 🔹 Note : Le Super Admin est injecté directement en base (pas de route de création)

// 🔹 Création d'un Admin (par Super Admin)
router.post("/api/superadmin/admin", auth, superadmin.creerAdmin);

// 🔹 Lister tous les admins
router.get("/api/superadmin/admins", auth, superadmin.listerAdmins);

// 🔹 Désactiver / Réactiver un admin
router.put("/api/superadmin/desactiver/:id", auth, superadmin.desactiverAdmin);
router.put("/api/superadmin/reactiver/:id", auth, superadmin.reactiverAdmin);

module.exports = router;
