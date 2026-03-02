const { pool } = require('../../config/db');

const createMstDeoTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS mst_deo (
        id SERIAL PRIMARY KEY,
        district_cd BIGINT ,
        district_name VARCHAR(50),
        deo_name  VARCHAR(50),
        mobile BIGINT,
        alternate_mobile BIGINT
    );
  `;
  await pool.query(query);
};

module.exports = { createMstDeoTable };
