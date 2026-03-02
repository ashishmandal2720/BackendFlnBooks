const {pool} = require('../config/db');

const createIsbnTable = async () => {
  const query = `CREATE TABLE IF NOT EXISTS tbc_isbn_codes (
    id SERIAL PRIMARY KEY,
    assignment_id INT REFERENCES tbc_subject_assignments(id) ON DELETE CASCADE,
    isbn_code VARCHAR(20) UNIQUE NOT NULL,
    barcode_path varchar(255) DEFAULT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;
  await pool.query(query);
};

module.exports = { createIsbnTable };