const { pool } = require('../../config/db');

const createJoinDirectorTable = async () => {
    const query = `
CREATE TABLE IF NOT EXISTS mst_join_directors (
id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_number BIGINT NOT NULL,
    division_name VARCHAR(100) NOT NULL,
    district_cds TEXT[],
	division_id INTEGER  );
    `;
    await pool.query(query);
};


module.exports = {
    createJoinDirectorTable
};
