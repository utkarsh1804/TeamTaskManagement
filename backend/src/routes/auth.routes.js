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
  logout,
  getMe,
  updateProfile,
  updatePassword,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, getMe);
router.patch("/profile", authMiddleware, validate(profileUpdateSchema), updateProfile);
router.patch("/password", authMiddleware, validate(passwordUpdateSchema), updatePassword);

module.exports = router;
