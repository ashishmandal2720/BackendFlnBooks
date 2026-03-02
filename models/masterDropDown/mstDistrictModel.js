const { pool } = require('../../config/db');

const createDistrictTable = async () => {
  const query = `CREATE TABLE IF NOT EXISTS mst_district (
          id SERIAL PRIMARY KEY,
          district_cd BIGINT NOT NULL UNIQUE,
          district_name VARCHAR(50) NOT NULL
        );`;
  await pool.query(query);
};

module.exports = { createDistrictTable };