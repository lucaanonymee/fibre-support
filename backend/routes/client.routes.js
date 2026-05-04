const router = require("express").Router();
const client = require("../controllers/client.controller");
const profile = require("../controllers/profile.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { uploadProfilePhoto } = require("../middlewares/profileUpload.middleware");

const auth = [authenticateToken, authorizeRoles("CLIENT")];

router.post("/api/client/ticket", auth, client.creerTicket);
router.get("/api/client/tickets", auth, client.consulterTicketsClient);

router.get("/api/client/profile", auth, profile.getProfile);
router.patch("/api/client/profile/photo", auth, uploadProfilePhoto, profile.updateProfilePhoto);


module.exports = router;
