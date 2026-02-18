const router = require("express").Router();
const client = require("../controllers/client.controller");
const { authenticateToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.use(authenticateToken, authorizeRoles("CLIENT"));

router.post("/api/client/ticket", client.creerTicket);
router.get("/api/client/tickets", client.consulterTicketsClient);


module.exports = router;
