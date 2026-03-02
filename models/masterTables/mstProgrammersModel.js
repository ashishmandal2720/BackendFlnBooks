const { pool } = require('../../config/db');

const createProgrammersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS mst_programmers (
        id SERIAL PRIMARY KEY,
        district_name VARCHAR(255),
        district_cd BIGINT REFERENCES mst_district(district_cd) ON DELETE CASCADE,
        programmer_name VARCHAR(255),
        mobile BIGINT
    );`;
  await pool.query(query);
};

const insertProgrammer = async (district_name, district_cd, programmer_name, mobile) => {
  const query = `
    INSERT INTO mst_programmers (district_name, district_cd, programmer_name, mobile) 
    VALUES ($1, $2, $3, $4) RETURNING *;`;
  const values = [district_name, district_cd, programmer_name, mobile];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const getAllProgrammers = async () => {
  const result = await pool.query('SELECT * FROM mst_programmers;');
  return result.rows;
};

const getProgrammerById = async (id) => {
  const result = await pool.query('SELECT * FROM mst_programmers WHERE id = $1;', [id]);
  return result.rows[0];
};

const updateProgrammer = async (id, district_name, district_cd, programmer_name, mobile) => {
  const query = `
    UPDATE mst_programmers 
    SET district_name = $1, district_cd = $2, programmer_name = $3, mobile = $4 
    WHERE id = $5 RETURNING *;`;
  const values = [district_name, district_cd, programmer_name, mobile, id];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const deleteProgrammer = async (id) => {
  const result = await pool.query('DELETE FROM mst_programmers WHERE id = $1 RETURNING *;', [id]);
  return result.rows[0];
};

module.exports = {
  createProgrammersTable,
  insertProgrammer,
  getAllProgrammers,
  getProgrammerById,
  updateProgrammer,
  deleteProgrammer
};
