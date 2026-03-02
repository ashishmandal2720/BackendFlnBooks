const { pool } = require("../config/db");

const createSchBookDistribution = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS tbc_school_challans (
            id SERIAL PRIMARY KEY,
            udise_code BIGINT REFERENCES mst_schools(udise_sch_code),
            sender_id INT NOT NULL,
            school_id INT NULL,
            challan_date DATE,
            challan_number TEXT ,
            dispatch_status BOOLEAN DEFAULT TRUE,
            received_status BOOLEAN DEFAULT FALSE,
            received_qty bigint DEFAULT 0,
            received_at TIMESTAMP,
            received_by INT REFERENCES mst_users(user_id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tbc_school_challan_books (
            id SERIAL PRIMARY KEY,
            udise_code BIGINT NOT NULL,
            challan_id INT REFERENCES tbc_school_challans(id),
            book_id INT REFERENCES tbc_books(id),
            quantity INT NOT NULL,
            remaining_qty INT NOT NULL,
            received_qty INT DEFAULT 0,
            distributed_qty bigint DEFAULT 0,
            distributed_by INT REFERENCES mst_users(user_id),
            received_status BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS tbc_book_tracking (
            id SERIAL PRIMARY KEY,
            isbn TEXT NOT NULL,
            udise_code BIGINT NOT NULL,
            unique_code TEXT UNIQUE NOT NULL,
            book_id INT REFERENCES tbc_books(id),
            challan_id INT REFERENCES tbc_school_challans(id),
            school_id INT REFERENCES mst_users(user_id),
            scanned_yn BOOLEAN DEFAULT FALSE,
            scanned_at TIMESTAMP,
            scanned_by INT REFERENCES mst_users(user_id),
            subject_id INT REFERENCES mst_subjects(id)
        );`;
    await pool.query(query);
};

module.exports = { createSchBookDistribution };
