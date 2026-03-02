const { pool } = require("../../config/db");

const getNotifications = async (req, res) => {
    /* #swagger.tags = ['Notifications'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
      const user_id = req.user.user_id;
  
      const notifications = await pool.query(
        "SELECT * FROM tbc_notifications WHERE user_id = $1 ORDER BY created_at DESC",
        [user_id]
      );
  
      res.json(notifications.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  // Mark Notification as Read
  const markNotificationAsRead = async (req, res) => {
    /* #swagger.tags = ['Notifications'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
      const { notification_id } = req.params;

      const notificationNumber = parseInt(notification_id); // Ensure notification_id is an integer
      await pool.query(
        "UPDATE tbc_notifications SET is_read = TRUE WHERE id = $1",
        [notificationNumber]
      );
  
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  module.exports = { getNotifications, markNotificationAsRead };
