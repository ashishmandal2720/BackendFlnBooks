// studentCountsModel.js
const { pool } = require("../config/db");

const createStudentCounts = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS public.student_counts (
      id SERIAL PRIMARY KEY,
      district_name VARCHAR(100),
      block_name VARCHAR(100),
      school_name VARCHAR(200),
      school_udise_code BIGINT,
      school_medium VARCHAR(50),
      school_management_type VARCHAR(100),
      hm_principal_name VARCHAR(100),
      hm_principal_mobile VARCHAR(100),
      class_1 INTEGER DEFAULT 0,
      class_2 INTEGER DEFAULT 0,
      class_3 INTEGER DEFAULT 0,
      class_4 INTEGER DEFAULT 0,
      class_5 INTEGER DEFAULT 0,
      class_6 INTEGER DEFAULT 0,
      class_7 INTEGER DEFAULT 0,
      class_8 INTEGER DEFAULT 0,
      class_9 INTEGER DEFAULT 0,
      class_10 INTEGER DEFAULT 0,
      total_students INTEGER DEFAULT 0
    );
  `;

  try {
    await pool.query(query);
    // console.log('✅ student_counts table created or already exists');
  } catch (err) {
    console.error('❌ Error creating student_counts table:', err);
  }
};

module.exports = {
  createStudentCounts,
};
