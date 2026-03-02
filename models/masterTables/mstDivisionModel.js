const { pool } = require('../../config/db');

const createMstDivisionTable = async () => {
    const query = `
CREATE TABLE IF NOT EXISTS mst_division (
    id SERIAL PRIMARY KEY,
    district_cds TEXT[],
    division_id INT NOT NULL,
    division_name VARCHAR(100) NOT NULL
  );
    `;
    await pool.query(query);
};


module.exports = {
    createMstDivisionTable
};
