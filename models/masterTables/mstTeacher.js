const { pool } = require('../../config/db');

const createMstTeacher = async () => {
    const query = `CREATE TABLE IF NOT EXISTS public.mst_teacher
(
    id SERIAL PRIMARY KEY,
    udise_id bigint,
    current_udise_id bigint,
    teacher_code VARCHAR NOT NULL,
    name_hin VARCHAR,
    name_eng VARCHAR,
    designation_id integer,
    designation_name_eng VARCHAR,
    designation_name_hin VARCHAR,
    mobile_no bigint,
    status boolean DEFAULT true,
    role integer DEFAULT 4
);`;
    await pool.query(query);
};

module.exports = { createMstTeacher };