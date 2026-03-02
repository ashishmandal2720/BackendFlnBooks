const { pool } = require('../config/db');
const createChallanTbl = async () => {
    const query = `CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tbc_depot_challans (
    id SERIAL PRIMARY KEY,
    challan_number VARCHAR(8) UNIQUE NOT NULL DEFAULT 
        (TRUNC(RANDOM() * (99999999 - 10000) + 10000)::TEXT),
    challan_date DATE NOT NULL,
    publisher_id INT REFERENCES mst_users(user_id),
    depot_id INT REFERENCES mst_users(user_id),
    dispatch_status BOOLEAN DEFAULT FALSE,
    total_weight FLOAT DEFAULT 0,
    verify boolean NOT NULL DEFAULT false,
    remarks text DEFAULT NULL,
    received_quantity INT
);
  
  CREATE TABLE IF NOT EXISTS tbc_depot_challan_books (
    id SERIAL PRIMARY KEY,
    challan_id INT REFERENCES tbc_depot_challans(id),
    book_id INT REFERENCES tbc_books(id),
    sets INT NOT NULL,
    books_per_set INT NOT NULL,
    book_weight FLOAT NOT NULL,
    bundle_weight FLOAT NOT NULL,
    open_books INT DEFAULT 0,
    total_books INT GENERATED ALWAYS AS ((books_per_set * sets) + open_books) STORED,
    remaining_qty INT NOT NULL,
    
    received_qty INT DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS tbc_depot_deo_challans (
    id SERIAL PRIMARY KEY,
    challan_number VARCHAR UNIQUE,
    challan_date DATE,
    depot_id INT REFERENCES mst_users(user_id),
    deo_id INT REFERENCES mst_users(user_id),
    total_weight NUMERIC,
    dispatch_status BOOLEAN DEFAULT FALSE,
    is_received BOOLEAN DEFAULT FALSE,
    received_date TIMESTAMP,
    remarks text DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tbc_depot_deo_challan_books (
    id SERIAL PRIMARY KEY,
    challan_id INT REFERENCES tbc_depot_deo_challans(id) ON DELETE CASCADE,
    book_id INT REFERENCES tbc_books(id),
    sets INT,
    books_per_set INT,
    open_books INT DEFAULT 0,
    book_weight NUMERIC,
    bundle_weight NUMERIC,
    total_books INT GENERATED ALWAYS AS ((books_per_set * sets) + open_books) STORED,
    remaining_qty INT NOT NULL
);

  CREATE TABLE IF NOT EXISTS tbc_depot_cluster_challans (
  id SERIAL PRIMARY KEY,
  challan_number BIGINT,
  challan_date DATE NOT NULL,
  depot_id INT REFERENCES mst_users(user_id),
  cluster_id BIGINT REFERENCES mst_users(user_id),
  total_books INT DEFAULT 0,
  total_weight NUMERIC DEFAULT 0,
  dispatch_status BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT false,
  received_qty INT DEFAULT 0,
  remarks TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tbc_depot_cluster_challan_books (
  id  SERIAL PRIMARY KEY,
  challan_id BIGINT REFERENCES tbc_depot_cluster_challans(id) ON DELETE CASCADE,
  book_id INT REFERENCES tbc_books(id),
  sets INT,
  books_per_set INT,
  open_books INT DEFAULT 0,
  book_weight NUMERIC,
  bundle_weight NUMERIC,
  total_books INT ,
  remaining_qty INT NOT NULL,
  received_qty INT DEFAULT 0
);
  `;
  await pool.query(query);
};

module.exports = { createChallanTbl };