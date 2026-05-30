const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { apiKeyCreateSchema } = require("../lib/schemas");
const { listKeys, createKey, revokeKey } = require("../controllers/apiKeys.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", listKeys);
router.post("/", validate(apiKeyCreateSchema), createKey);
router.delete("/:keyId", revokeKey);

module.exports = router;
