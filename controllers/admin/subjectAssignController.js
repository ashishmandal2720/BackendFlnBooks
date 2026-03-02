const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");

// book Assign
const assignSubject = async (req, res) => {
    /* #swagger.tags = ['Assign Subjects'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
        const { subject_id, publisher_id, class_level, session } = req.body;

        const publisherCheck = await pool.query("SELECT * FROM mst_users WHERE user_id = $1 AND role_id = '2'", [publisher_id]);
        if (publisherCheck.rows.length === 0) {
            return responseHandler(res, 400, "Invalid publisher");
        }

        const subjectCheck = await pool.query("SELECT * FROM mst_subjects WHERE id = $1", [subject_id]);
        if (subjectCheck.rows.length === 0) {
            return responseHandler(res, 400, "Invalid subject");
        }
        
        const assignmentCheck = await pool.query("SELECT * FROM tbc_subject_assignments WHERE subject_id=$1 and publisher_id=$2", [subject_id, publisher_id]);
        if (assignmentCheck.rows.length !== 0) {
            return responseHandler(res, 400, "Already assigned");
        }
        const assignment = await pool.query(
            "INSERT INTO tbc_subject_assignments (subject_id, publisher_id, class_level,current_session,assigned_by) VALUES ($1, $2, $3,$4,$5) RETURNING *",
            [subject_id, publisher_id, class_level,session, req?.user?.user_id]
        );

        responseHandler(res, 201, "Subject assigned successfully", assignment.rows[0]);
    } catch (error) {
        responseHandler(res, 400, "Error assigning subject", null, error);
    }
};




// Get All Assignments
const getAssignments = async (req, res) => {
    /* #swagger.tags = ['Assign Subjects'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
        const result = await pool.query(
            `SELECT sa.id, s.name AS subject_name, sa.class_level, u.name AS publisher_name, sa.assigned_date
       FROM tbc_subject_assignments sa
       JOIN mst_subjects s ON sa.subject_id = s.id
       JOIN mst_users u ON sa.publisher_id = u.user_id
       ORDER BY sa.assigned_date DESC`
        );
        responseHandler(res, 200, "Assignments fetched", result.rows);
    } catch (error) {
        responseHandler(res, 400, "Error fetching assignments", null, error);
    }
};

// Get Assignments by Publisher ID
// 08530110072875

const getAssignmentsByPublisher = async (req, res) => {
    /* #swagger.tags = ['Assign Subjects'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
        const { publisher_id } = req.params;
        const publisherId = parseInt(publisher_id); // Ensure publisher_id is an integer
        const result = await pool.query(
            `SELECT sa.id, s.name AS subject_name, sa.class_level, sa.assigned_date
       FROM tbc_subject_assignments sa
       JOIN mst_subjects s ON sa.subject_id = s.id
       WHERE sa.publisher_id = $1
       ORDER BY sa.assigned_date DESC`,
            [publisherId]
        );
        responseHandler(res, 200, "Assignments fetched", result.rows);
    } catch (error) {
        responseHandler(res, 400, "Error fetching assignments", null, error);
    }
};

// Delete Assignment
const deleteAssignment = async (req, res) => {
    /* #swagger.tags = ['Assign Subjects'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
        const { id } = req.params;
        const assignmentId = parseInt(id); // Ensure id is an integer
        const deletedAssignment = await pool.query("DELETE FROM tbc_subject_assignments WHERE id = $1 RETURNING *", [assignmentId]);

        if (deletedAssignment.rows.length === 0) {
            return responseHandler(res, 404, "Assignment not found");
        }

        responseHandler(res, 200, "Assignment deleted successfully", []);
    } catch (error) {
        responseHandler(res, 400, "Error deleting assignment", null, error);
    }
};

module.exports = { assignSubject, getAssignments, getAssignmentsByPublisher, deleteAssignment };