const { pool } = require("../config/db");

const createSchoolEnrolment = async () => {
    const query = `CREATE TABLE IF NOT EXISTS school_enrolment (
        id SERIAL PRIMARY KEY,
        schMobile VARCHAR(55) DEFAULT 0,
        affiliatedBoard INT,
        affiliationCd VARCHAR(255),
        medium INT,
        pdfPath TEXT,
        verifiedByCluster BOOLEAN DEFAULT FALSE,
        total_std INT DEFAULT 0,
        district_cd INT,
        district_Name VARCHAR(255),
        block_cd INT,
        block_Name VARCHAR(255),
        cluster_cd BIGINT,
        cluster_name VARCHAR(255),
        udise_sch_code BIGINT,
        school_name VARCHAR(255),
        sch_category_id INT DEFAULT 0,
        sch_mgmt_id INT DEFAULT 0,
        cls1b INT DEFAULT 0, cls1g INT DEFAULT 0, cls1t INT DEFAULT 0, cls1th INT DEFAULT 0,
        cls2b INT DEFAULT 0, cls2g INT DEFAULT 0, cls2t INT DEFAULT 0, cls2th INT DEFAULT 0,
        cls3b INT DEFAULT 0, cls3g INT DEFAULT 0, cls3t INT DEFAULT 0, cls3th INT DEFAULT 0,
        cls4b INT DEFAULT 0, cls4g INT DEFAULT 0, cls4t INT DEFAULT 0, cls4th INT DEFAULT 0,
        cls5b INT DEFAULT 0, cls5g INT DEFAULT 0, cls5t INT DEFAULT 0, cls5th INT DEFAULT 0,
        cls6g INT DEFAULT 0, cls6t INT DEFAULT 0, cls6th INT DEFAULT 0,
        cls7g INT DEFAULT 0, cls7t INT DEFAULT 0, cls7th INT DEFAULT 0,
        cls8g INT DEFAULT 0, cls8t INT DEFAULT 0, cls8th INT DEFAULT 0,
        cls6b INT DEFAULT 0, cls7b INT DEFAULT 0, cls8b INT DEFAULT 0,
        cls9b INT DEFAULT 0, cls9g INT DEFAULT 0, cls9t INT DEFAULT 0, cls9th INT DEFAULT 0,
        cls10b INT DEFAULT 0, cls10g INT DEFAULT 0, cls10t INT DEFAULT 0, cls10th INT DEFAULT 0,
        cls11b INT DEFAULT 0, cls11g INT DEFAULT 0, cls11t INT DEFAULT 0, cls11th INT DEFAULT 0,
        cls12b INT DEFAULT 0, cls12g INT DEFAULT 0, cls12t INT DEFAULT 0, cls12th INT DEFAULT 0,
        cls9bh INT DEFAULT 0, cls9gh INT DEFAULT 0, cls10bh INT DEFAULT 0, cls10gh INT DEFAULT 0,
        cls1bh INT DEFAULT 0, cls1gh INT DEFAULT 0, cls2bh INT DEFAULT 0, cls2gh INT DEFAULT 0,
        cls3bh INT DEFAULT 0, cls3gh INT DEFAULT 0, cls4bh INT DEFAULT 0, cls4gh INT DEFAULT 0,
        cls5bh INT DEFAULT 0, cls5gh INT DEFAULT 0, cls6bh INT DEFAULT 0, cls6gh INT DEFAULT 0,
        cls7bh INT DEFAULT 0, cls7gh INT DEFAULT 0, cls8bh INT DEFAULT 0, cls8gh INT DEFAULT 0,
        cls11bh INT DEFAULT 0, cls11gh INT DEFAULT 0, cls12bh INT DEFAULT 0, cls12gh INT DEFAULT 0    );`;
    await pool.query(query);
};

module.exports = { createSchoolEnrolment };
