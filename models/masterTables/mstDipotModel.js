const { pool } = require('../../config/db');

const createMstDepotTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS mst_depot (
        id SERIAL PRIMARY KEY,
        depot_cd INT UNIQUE,
        depot_name VARCHAR(255),
        depot_manager VARCHAR(255),
        district_cds TEXT[]
    );
  `;
  await pool.query(query);
};


module.exports = { createMstDepotTable 
};
