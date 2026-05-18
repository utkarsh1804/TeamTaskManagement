const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const {
  getDashboard,
  getActivityLog,
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
  markOneRead,
  deleteNotification,
  deleteAllNotifications,
} = require("../controllers/dashboard.controller");

const router = express.Router();

router.get("/dashboard", authMiddleware, getDashboard);
router.get("/activity-log", authMiddleware, getActivityLog);

router.get("/notifications", authMiddleware, getNotifications);
router.get("/notifications/unread-count", authMiddleware, getUnreadCount);
router.patch("/notifications/read", authMiddleware, markNotificationsRead);
router.patch("/notifications/:id/read", authMiddleware, markOneRead);
router.delete("/notifications/:id", authMiddleware, deleteNotification);
router.delete("/notifications", authMiddleware, deleteAllNotifications);

module.exports = router;
