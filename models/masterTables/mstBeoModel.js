const { pool } = require('../../config/db');

const createMstBeoTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS mst_beo (
        id SERIAL PRIMARY KEY,
        district_cd BIGINT REFERENCES mst_district(district_cd) ON DELETE CASCADE,
        block_cd BIGINT REFERENCES mst_block(block_cd) ON DELETE CASCADE,
        district_name VARCHAR(50),
        block_name VARCHAR(50),
        beo_name  VARCHAR(50),
        mobile BIGINT
    );
  `;
  await pool.query(query);
};

module.exports = { createMstBeoTable };
