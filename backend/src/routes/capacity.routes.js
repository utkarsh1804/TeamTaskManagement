const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const { getCapacity } = require("../controllers/capacity.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getCapacity);

module.exports = router;
