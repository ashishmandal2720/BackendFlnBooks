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
      `);
      console.log('💫 Database and default user role initialized');
    } catch (error) {
      console.error('Error creating tables:', error);
    }
  };

  module.exports = { insertValueInTables };