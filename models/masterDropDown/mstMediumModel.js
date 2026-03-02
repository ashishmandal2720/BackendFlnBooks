const { pool } = require('../../config/db');

const createMediumTable = async () => {
  const query = `CREATE TABLE IF NOT EXISTS mst_medium (
          id SERIAL PRIMARY KEY,
          medium_cd INT UNIQUE NOT NULL,
          medium_name VARCHAR(50)
        );`;
  await pool.query(query);
};

module.exports = { createMediumTable };