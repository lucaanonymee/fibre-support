const router = require("express").Router();
const ai = require("../controllers/ai.controller");

router.post("/api/predict", ai.predict);

module.exports = router;
