const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { twoFactorVerifySchema, twoFactorDisableSchema } = require("../lib/schemas");
const { getStatus, setup, enable, disable } = require("../controllers/twoFactor.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/status", getStatus);
router.post("/setup", setup);
router.post("/enable", validate(twoFactorVerifySchema), enable);
router.post("/disable", validate(twoFactorDisableSchema), disable);

module.exports = router;
