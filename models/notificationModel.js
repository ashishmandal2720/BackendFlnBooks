const {pool} = require('../config/db');
const createNotificationTable = async () => {
  const query = `CREATE TABLE IF NOT EXISTS tbc_notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES mst_users(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;
  await pool.query(query);
};

module.exports = { createNotificationTable };
