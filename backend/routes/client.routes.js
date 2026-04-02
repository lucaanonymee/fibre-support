const router = require("express").Router();
const client = require("../controllers/client.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

const auth = [authenticateToken, authorizeRoles("CLIENT")];

router.post("/api/client/ticket", auth, client.creerTicket);
router.get("/api/client/tickets", auth, client.consulterTicketsClient);


module.exports = router;
