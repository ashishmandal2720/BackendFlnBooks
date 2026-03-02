const { pool } = require('../../config/db');

const createMstCacTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS mst_cac (
        id SERIAL PRIMARY KEY,
        district_cd INT REFERENCES mst_district(district_cd),
        district_name VARCHAR(255),
        block_cd BIGINT REFERENCES mst_block(block_cd),
        block_name VARCHAR(255),
        cluster_cd BIGINT REFERENCES mst_cluster(cluster_cd),
        cluster_name VARCHAR(255),
        cac_name VARCHAR(255),
        cac_mobile VARCHAR(15),
        gender VARCHAR(10) 
    );
  `;
  await pool.query(query);
};

module.exports = { createMstCacTable };
