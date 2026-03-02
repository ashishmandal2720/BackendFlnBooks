// models/subjectModel.js
const { pool } = require('../config/db');

const createSubjectTable = async () => {
  const query = `CREATE TABLE IF NOT EXISTS mst_subjects (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          class_level VARCHAR(50) NOT NULL,
          medium INT REFERENCES mst_medium(medium_cd) NOT NULL,
          district_id INT REFERENCES mst_district(district_cd) NULL,
          book_type VARCHAR(50) NULL,
          book_id integer,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
  await pool.query(query);
};

module.exports = { createSubjectTable };