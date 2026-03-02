// // models/publishersModel.js
// const pool = require('../db');

// const createPublisherTable = async () => {
//   const query = `CREATE TABLE IF NOT EXISTS publishers (
//     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//     name VARCHAR(255) NOT NULL,
//     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//   )`;
//   await pool.query(query);
// };

// module.exports = { createPublisherTable };