const { pool } = require('../config/db');
const createBookAssignTable = async () => {
    const query = `CREATE TABLE IF NOT EXISTS tbc_book_assignments (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES tbc_books(id) ON DELETE CASCADE,
    publisher_id INT REFERENCES mst_users(user_id) ON DELETE CASCADE,
    unique_identifier VARCHAR(20) NOT NULL,
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quantity INT NOT NULL,
    remaining_qty INT NOT NULL,
    verify Boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS tbc_generated_barcodes (
    id SERIAL PRIMARY KEY,
    publisher_id INT REFERENCES mst_users(user_id) ON DELETE CASCADE,
    order_id INT REFERENCES tbc_book_assignments(id) ON DELETE CASCADE,
    book_id INT REFERENCES tbc_books(id) ON DELETE CASCADE,
    class_level INTEGER NOT NULL,
    start_barcode BIGINT NOT NULL,
    end_barcode BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;
await pool.query(query);
};

module.exports = { createBookAssignTable };
