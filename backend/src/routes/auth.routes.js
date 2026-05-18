const express = require("express");

const validate = require("../middleware/validate.middleware");
const authMiddleware = require("../middleware/auth.middleware");
const {
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  passwordUpdateSchema,
} = require("../lib/schemas");
const {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  listSessions,
  revokeSession,
  revokeAllSessions,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.get("/me", authMiddleware, getMe);
router.patch("/profile", authMiddleware, validate(profileUpdateSchema), updateProfile);
router.patch("/password", authMiddleware, validate(passwordUpdateSchema), updatePassword);

router.get("/sessions", authMiddleware, listSessions);
router.delete("/sessions/:id", authMiddleware, revokeSession);
router.delete("/sessions", authMiddleware, revokeAllSessions);

module.exports = router;
