const router = require("express").Router();
const superadmin = require("../controllers/superadmin.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

const auth = [authenticateToken, authorizeRoles("SUPER_ADMIN")];

// 🔹 Note : Le Super Admin est injecté directement en base (pas de route de création)

// 🔹 Création d'un Admin (par Super Admin)
router.post("/api/superadmin/admin", auth, superadmin.creerAdmin);

// 🔹 Lister tous les utilisateurs (ADMIN / CLIENT / TECHNICIEN)
router.get("/api/superadmin/utilisateurs", auth, superadmin.listerUtilisateurs);

// 🔹 Journal des actions superadmin
router.get("/api/superadmin/actions", auth, superadmin.listerActions);

// 🔹 Désactiver / Réactiver un utilisateur (hors SUPER_ADMIN)
router.put("/api/superadmin/desactiver/:id", auth, superadmin.desactiverUtilisateur);
router.put("/api/superadmin/reactiver/:id", auth, superadmin.reactiverUtilisateur);

module.exports = router;
