const express = require("express");

const { stream } = require("../controllers/events.controller");

const router = express.Router();

// Auth is handled inside the controller (token may arrive via query string).
router.get("/", stream);

module.exports = router;
