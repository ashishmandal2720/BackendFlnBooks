// models/rolesModel.js
const { pool } = require('../config/db');

const createRolesTable = async () => {
    const query = `CREATE TABLE IF NOT EXISTS mst_roles (
            role_id SERIAL PRIMARY KEY,
            role_name VARCHAR(50) NOT NULL UNIQUE,
            hierarchy_level INTEGER NOT NULL
        );`;
    await pool.query(query);
}

module.exports = { createRolesTable };