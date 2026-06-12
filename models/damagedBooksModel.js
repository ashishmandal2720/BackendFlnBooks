const { pool } = require('../config/db');

const createDamagedBooksTable = async () => {
  const query = `CREATE TABLE IF NOT EXISTS tbc_damaged_books (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES tbc_books(id),
    udise_code BIGINT REFERENCES mst_schools(udise_sch_code),
    user_id INT REFERENCES mst_users(user_id),
    damaged_qty INT NOT NULL,
    reason TEXT,
    scan_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  DO $$
  BEGIN
      IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'unique_damaged_book_entry'
          AND conrelid = 'tbc_damaged_books'::regclass
      ) THEN
          ALTER TABLE tbc_damaged_books
          ADD CONSTRAINT unique_damaged_book_entry UNIQUE (book_id, udise_code, user_id);
      END IF;
  END
  $$;`;
  await pool.query(query);
};

module.exports = { createDamagedBooksTable };
