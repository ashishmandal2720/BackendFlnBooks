const { pool } = require('../../config/db');

const createBlockTable = async () => {
  const query = `CREATE TABLE IF NOT EXISTS mst_block (
          id SERIAL PRIMARY KEY,
          district_cd BIGINT REFERENCES mst_district(district_cd),
          block_cd BIGINT UNIQUE,
          block_name VARCHAR(50) 
        );`;
  await pool.query(query);
};

module.exports = { createBlockTable };