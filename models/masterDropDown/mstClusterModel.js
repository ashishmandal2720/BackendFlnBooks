const { pool } = require('../../config/db');

const createClusterTable = async () => {
  const query = `CREATE TABLE IF NOT EXISTS mst_cluster (
          id SERIAL PRIMARY KEY,
          district_cd BIGINT REFERENCES mst_district(district_cd),
          district_name VARCHAR(50) ,
          block_cd BIGINT REFERENCES mst_block(block_cd),
          block_name VARCHAR(50) ,
          cluster_cd BIGINT UNIQUE,
          cluster_name VARCHAR(50) 
        );`;
  await pool.query(query);
};

module.exports = { createClusterTable };