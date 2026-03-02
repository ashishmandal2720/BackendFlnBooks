const { pool } = require('../config/db');

const createBarcodeList = async () => {
  const query = `CREATE TABLE IF NOT EXISTS tbc_unique_barcodes (
    id SERIAL PRIMARY KEY,
    publisher_id INT REFERENCES mst_users(user_id) ON DELETE CASCADE, 
    isbn VARCHAR(13) NOT NULL,
    barcode VARCHAR(13) UNIQUE NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;
  await pool.query(query);
};

module.exports = { createBarcodeList };