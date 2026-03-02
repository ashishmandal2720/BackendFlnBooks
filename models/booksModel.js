const { pool } = require('../config/db');
const createBooksTable = async () => {
    const query = `CREATE TABLE IF NOT EXISTS tbc_books (
    id SERIAL PRIMARY KEY,
    isbn_code VARCHAR(20) UNIQUE REFERENCES tbc_isbn_codes(isbn_code) ON DELETE CASCADE,
    publisher_id INT REFERENCES mst_users(user_id) ON DELETE CASCADE,
    subject_id INT REFERENCES mst_subjects(id) ON DELETE CASCADE,
    class_level VARCHAR(50) NOT NULL,
    front_cover_url TEXT,
    back_cover_url TEXT,
    content_rcv_yn TEXT,
    content_pub_rcv TEXT DEFAULT '2',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;
await pool.query(query);
};

module.exports = { createBooksTable };