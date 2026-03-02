const { pool } = require('../../config/db');

const createPublisherTable = async () => {
  const query = `CREATE TABLE IF NOT EXISTS mst_publisher (
          id SERIAL PRIMARY KEY,
          publisher_name VARCHAR(50)  ,
          contact_person VARCHAR(50)  ,
          mobile BIGINT ,
          email VARCHAR(50),
          address TEXT 
        );`;
  await pool.query(query);
};

module.exports = { createPublisherTable };