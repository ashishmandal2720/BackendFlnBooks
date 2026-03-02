const { pool } = require("../config/db");

const createSchBookDistribution = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS tbc_school_challans (
            id SERIAL PRIMARY KEY,
            udise_code BIGINT REFERENCES mst_schools(udise_sch_code),
            sender_id INT,
            school_id INT REFERENCES mst_users(user_id),
            challan_date DATE NOT NULL,
            challan_number TEXT UNIQUE,
            dispatch_status BOOLEAN DEFAULT FALSE,
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

        CREATE TABLE IF NOT EXISTS public.tbc_depot_book_stock
        (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            book_id integer NOT NULL,
            total_dispatched integer NOT NULL DEFAULT 0,
            remaining_qty integer NOT NULL DEFAULT 0,
            total_received integer NOT NULL DEFAULT 0,
            last_updated_at timestamp with time zone DEFAULT now()
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
        );
        
        DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tbc_school_challan_books' 
          AND column_name = 'medium'
    ) THEN
        ALTER TABLE tbc_school_challan_books 
        ADD COLUMN medium INT;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tbc_school_challan_books' 
          AND column_name = 'sch_type'
    ) THEN
        ALTER TABLE tbc_school_challan_books 
        ADD COLUMN sch_type INT;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tbc_school_challans' 
          AND column_name = 'sch_type'
    ) THEN
        ALTER TABLE tbc_school_challans 
        ADD COLUMN sch_type INT;
    END IF;
END;
$$;

        `;
    await pool.query(query);
};

module.exports = { createSchBookDistribution };

// black mirror