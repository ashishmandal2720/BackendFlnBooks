const { pool } = require('../config/db');

// Create tables if they don't exist
const insertValueInTables = async () => {
    try {
      await pool.query(` 
        INSERT INTO mst_roles (role_name, hierarchy_level) 
        VALUES ('Admin', 1)
        ON CONFLICT (role_name) DO NOTHING;
        INSERT INTO mst_roles (role_name, hierarchy_level) 
        VALUES ('Publisher', 2)
        ON CONFLICT (role_name) DO NOTHING;
        INSERT INTO mst_roles (role_name, hierarchy_level) 
        VALUES ('Depot', 3)
        ON CONFLICT (role_name) DO NOTHING;
        INSERT INTO mst_roles (role_name, hierarchy_level) 
        VALUES ('DEO', 4)
        ON CONFLICT (role_name) DO NOTHING;
        INSERT INTO mst_roles (role_name, hierarchy_level) 
        VALUES ('BEO', 5)
        ON CONFLICT (role_name) DO NOTHING;
        INSERT INTO mst_roles (role_name, hierarchy_level) 
        VALUES ('CAC', 6)
        ON CONFLICT (role_name) DO NOTHING;
        INSERT INTO mst_roles (role_name, hierarchy_level) 
        VALUES ('Schools', 7)
        ON CONFLICT (role_name) DO NOTHING;

        INSERT INTO mst_roles (role_name, hierarchy_level) 
        VALUES ('Teacher', 8)
        ON CONFLICT (role_name) DO NOTHING;

        INSERT INTO mst_roles (role_name, hierarchy_level) 
        VALUES ('Programmer', 9)
        ON CONFLICT (role_name) DO NOTHING;

        INSERT INTO mst_roles (role_name, hierarchy_level) 
        VALUES ('PrivateTeacher', 10)
        ON CONFLICT (role_name) DO NOTHING;
  
  
        INSERT INTO mst_users (name, email, password, role_id,contact_number,address, status) 
        VALUES ('Super Admin', 'admin@example.com', '$2a$12$OaX72mFm3w7tDtWcU/Fr9uAkxkdjqz0Q69G2OuaYBDw3swuMaqWXW', 1, '9988776655','Samagra Shiksha Office Raipur','Approved')
        ON CONFLICT (email) DO NOTHING;
        
        ALTER TABLE IF EXISTS public.tbc_depot_cluster_challans DROP CONSTRAINT IF EXISTS tbc_depot_cluster_challans_cluster_id_fkey;

        ALTER TABLE IF EXISTS public.tbc_depot_cluster_challans DROP CONSTRAINT IF EXISTS tbc_depot_cluster_challans_depot_id_fkey;

        DO $$

        BEGIN

        -- Add "remark" column if it does not exist

        IF NOT EXISTS (

        SELECT 1

        FROM information_schema.columns

        WHERE table_schema = 'public'

        AND table_name = 'tbc_depot_cluster_challan_books'

        AND column_name = 'remark'

        ) THEN

        EXECUTE 'ALTER TABLE public.tbc_depot_cluster_challan_books ADD COLUMN remark character varying';

        END IF;


    
        -- Add "verified" column if it does not exist
    
        IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tbc_depot_cluster_challan_books'
          AND column_name = 'verified'
    
          ) THEN
        EXECUTE 'ALTER TABLE public.tbc_depot_cluster_challan_books ADD COLUMN verified boolean DEFAULT false';
    
        END IF;

        END

        $$;

        DO $$
BEGIN
    -- Check if the constraint already exists on the table
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.tbc_depot_book_stock'::regclass 
        AND conname = 'unique_user_book'
    ) THEN
        -- If it doesn't exist, add it
        ALTER TABLE public.tbc_depot_book_stock
        ADD CONSTRAINT unique_user_book UNIQUE (user_id, book_id);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'mst_teacher'
          AND column_name = 'previous_udise_id'
    ) THEN
        ALTER TABLE mst_teacher ADD COLUMN previous_udise_id VARCHAR;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'mst_teacher'
          AND column_name = 'transfered'
    ) THEN
        ALTER TABLE mst_teacher ADD COLUMN transfered BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
      `);
      console.log('💫 Database and default user role initialized');
    } catch (error) {
      console.error('Error creating tables:', error);
    }
  };

  module.exports = { insertValueInTables };