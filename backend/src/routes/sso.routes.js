const express = require("express");

const { status, start, callback } = require("../controllers/sso.controller");

const router = express.Router();

// Public OAuth endpoints (no auth middleware — these establish a session).
router.get("/status", status);
router.get("/:provider", start);
router.get("/:provider/callback", callback);

module.exports = router;
