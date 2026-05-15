const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const {
  getDashboard,
  getActivityLog,
  getNotifications,
  markNotificationsRead,
} = require("../controllers/dashboard.controller");

const router = express.Router();

router.get("/dashboard", authMiddleware, getDashboard);
router.get("/activity-log", authMiddleware, getActivityLog);
router.get("/notifications", authMiddleware, getNotifications);
router.patch("/notifications/read", authMiddleware, markNotificationsRead);

module.exports = router;
