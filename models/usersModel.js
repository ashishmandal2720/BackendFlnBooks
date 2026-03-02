// models/userModel.js
const { pool } = require('../config/db');

const createUserTable = async () => {
  const query = ` CREATE TABLE IF NOT EXISTS mst_users (
            user_id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role_id INTEGER REFERENCES mst_roles(role_id),
            contact_number VARCHAR(15),
            address TEXT,
            profile_image TEXT,
            digital_signature TEXT,
            table_name VARCHAR(20),
            column_name VARCHAR(20),
            column_value VARCHAR(20),
            status VARCHAR(20) DEFAULT 'Pending',
            approved_by INTEGER REFERENCES mst_users(user_id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS public.mst_cac_insert_history (
  id SERIAL PRIMARY KEY,
  cluster_cd BIGINT UNIQUE,
  inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

        CREATE TABLE IF NOT EXISTS public.mst_deo_insert_history (
  id SERIAL PRIMARY KEY,
  district_cd BIGINT UNIQUE,
  inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public.mst_beo_insert_history (
  id SERIAL PRIMARY KEY,
  block_cd BIGINT UNIQUE,
  inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

        CREATE TABLE IF NOT EXISTS public.mst_programmer_insert_history (
  id SERIAL PRIMARY KEY,
  district_cd BIGINT ,
  inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

        CREATE TABLE IF NOT EXISTS public.mst_directors_insert_history (
  id SERIAL PRIMARY KEY,
  division_id BIGINT ,
  inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
        `;
  await pool.query(query);
};

module.exports = { createUserTable };