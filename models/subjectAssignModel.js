const { pool } = require("../config/db");
const subjectAssignment = async () => {
    const query = `CREATE TABLE IF NOT EXISTS tbc_subject_assignments (
        id SERIAL PRIMARY KEY,
        subject_id INT REFERENCES mst_subjects(id) ON DELETE CASCADE,
        publisher_id INT REFERENCES mst_users(user_id) ON DELETE CASCADE,
        class_level VARCHAR(50) NOT NULL,
        current_session VARCHAR(50) NOT NULL,
        book_cover_path varchar(255) DEFAULT NULL,
        book_content_path varchar(255) DEFAULT NULL,
        book_isbn_path varchar(255) DEFAULT NULL,
        assigned_by INT REFERENCES mst_users(user_id) ON DELETE CASCADE,
        assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
    await pool.query(query);
};

module.exports = { subjectAssignment };