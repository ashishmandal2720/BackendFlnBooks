const express = require("express");
const { getNotifications,markNotificationAsRead } = require("../../controllers/admin/notificationController");
const { authenticate } = require("../../middlewares/authMiddleware");

const router = express.Router();

// Notification Routes
router.get("/notifications", authenticate, getNotifications);
router.put("/notifications/:notification_id", authenticate, markNotificationAsRead);

module.exports = router;