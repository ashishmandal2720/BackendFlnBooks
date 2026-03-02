const { pool } = require('../../config/db');

const createMstSchoolsTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS mst_schools (
        id SERIAL PRIMARY KEY,
        udise_sch_code BIGINT UNIQUE  ,
        school_name VARCHAR(255) ,
        edu_state_cd VARCHAR(10) ,
        edu_state_name VARCHAR(255) ,
        district_cd INT ,
        district_name VARCHAR(255),
        block_cd BIGINT,
        block_name VARCHAR(255),
        cluster_cd BIGINT ,
        cluster_name VARCHAR(255),
        lgd_state_id INTEGER ,
        lgd_district_id INTEGER ,
        lgd_block_id INTEGER DEFAULT 0,
        lgd_village_id INTEGER DEFAULT NULL,
        lgd_village_name VARCHAR(255) DEFAULT '',
        lgd_panchayat_id INTEGER DEFAULT NULL,
        lgd_panchayat_name VARCHAR(255) DEFAULT '',
        lgd_ulb_id INTEGER ,
        lgd_ulb_name VARCHAR(255) ,
        lgd_ward_id INTEGER ,
        lgd_ward_name VARCHAR(255) ,
        sch_category_id INTEGER ,
        sch_type_id INTEGER ,
        sch_mgmt_id INTEGER ,
        sch_mgmt_center_id INTEGER ,
        sch_status_id INTEGER DEFAULT 0,
        sch_loc_type_id INTEGER ,
        lowest_class INTEGER ,
        highest_class INTEGER ,
        pre_primary_availability INTEGER ,
        pre_primary_class_from INTEGER DEFAULT -3,
        estd_year VARCHAR(10) ,
        address TEXT ,
        pin_code VARCHAR(10) ,
        email VARCHAR(255) ,
        hos_mobile VARCHAR(15) ,
        sch_mobile VARCHAR(15) ,
        resp_mobile VARCHAR(15) ,
        pmshri_sages INTEGER ,
        new_category_id INTEGER ,
        vtp_staff INTEGER ,
        vtp INTEGER 
    );
  `;
    await pool.query(query);
};

module.exports = { createMstSchoolsTable };
