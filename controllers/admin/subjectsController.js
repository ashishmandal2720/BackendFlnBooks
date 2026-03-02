const xlsx = require("xlsx");
const format = require("pg-format");
const fs = require("fs");

const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");

// Add Subject
const addSubject = async (req, res) => {
    /* #swagger.tags = ['Subjects'] */
    /* #swagger.security = [{'Bearer': []}] */
    try {
        const { name, class_level, district, book_type, medium } = req.body;

        if (!name || !class_level || !medium) {
            return responseHandler(res, 400, 'All fields are required');
        }

        const newSubject = await pool.query(
            "INSERT INTO mst_subjects (name, class_level,district_id,book_type,medium) VALUES ($1, $2,$3,$4,$5) RETURNING *",
            [name, class_level, district, book_type, medium]
        );
        responseHandler(res, 201, 'Subject added successfully', newSubject.rows[0]);
    } catch (error) {
        responseHandler(res, 400, 'Error adding subject', null, error);
    }
};

// Get All Subjects
const getSubjects = async (req, res) => {
    /* #swagger.tags = ['Subjects'] */
    /* #swagger.security = [{'Bearer': []}] */
    try {
        const result = await pool.query(`SELECT ms.*,m.medium_name FROM mst_subjects as ms 
    JOIN mst_medium m ON ms.medium::int = m.medium_cd
ORDER BY ms.created_at DESC`);
        responseHandler(res, 200, 'Subjects fetched', result.rows);
    } catch (error) {
        responseHandler(res, 400, 'Error fetching subjects', null, error);
    }
};


// Get All Subjects For Order
const getSubjectsForOrder = async (req, res) => {
    /* #swagger.tags = ['Subjects'] */
    /* #swagger.security = [{'Bearer': []}] */
    try {
        const result = await pool.query(`SELECT sa.id, s.name , sa.class_level, u.name AS publisher_name,sa.publisher_id, sa.assigned_date,tb.id as book_id,tb.isbn_code, tb.front_cover_url, tb.back_cover_url, tb.content_rcv_yn, sa.book_isbn_path
       FROM tbc_subject_assignments sa
       JOIN mst_subjects s ON sa.subject_id = s.id
       JOIN mst_users u ON sa.publisher_id = u.user_id
	   INNER JOIN tbc_books as tb on sa.publisher_id= tb.publisher_id and sa.subject_id = tb.subject_id
	   where sa.book_isbn_path !='' and not exists (select book_id from tbc_book_assignments where book_id = tb.id)
       ORDER BY sa.assigned_date DESC`);
        responseHandler(res, 200, 'Subjects fetched', result.rows);
    } catch (error) {
        responseHandler(res, 400, 'Error fetching subjects', null, error);
    }
};
    //    INNER JOIN tbc_book_assignments as tba on tba.book_id=tb.id

// Get All Subjects Assign Publisher
const getSubjectsForAssignPublisher = async (req, res) => {
    /* #swagger.tags = ['Subjects'] */
    /* #swagger.security = [{'Bearer': []}] */
    try {
        const result = await pool.query(`SELECT ms.*,m.medium_name,mu.publisher_id,mu.book_isbn_path,mu.id as assignment_id,mu.current_session, tb.front_cover_url,
    tb.back_cover_url,tba.quantity,
    tb.content_rcv_yn,tb.id as book_id,tb.isbn_code FROM mst_subjects as ms 
    JOIN mst_medium m ON ms.medium::int = m.medium_cd
LEFT OUTER JOIN tbc_subject_assignments as mu ON mu.subject_id=ms.id
LEFT OUTER JOIN tbc_books as tb on ms.id= tb.subject_id and mu.publisher_id= tb.publisher_id
LEFT OUTER JOIN tbc_book_assignments as tba on tba.book_id=tb.id

ORDER BY ms.created_at DESC`);
        responseHandler(res, 200, 'Subjects fetched', result.rows);
    } catch (error) {
        responseHandler(res, 400, 'Error fetching subjects', null, error);
    }
};

// Get Subject by ID
const getSubjectById = async (req, res) => {
    /* #swagger.tags = ['Subjects'] */
    /* #swagger.security = [{'Bearer': []}] */
    try {
        const { id } = req.query;
        const subjectId = parseInt(id); // Ensure id is an integer
        const result = await pool.query(`SELECT ms.*,m.medium_name,mu.publisher_id,mu.book_isbn_path,mu.id as assignment_id,mu.current_session, tb.front_cover_url,
    tb.back_cover_url,
    tb.content_rcv_yn,tb.id as book_id,tb.isbn_code FROM mst_subjects as ms 
    JOIN mst_medium m ON sb.medium::int = m.medium_cd
LEFT OUTER JOIN tbc_subject_assignments as mu ON mu.subject_id=ms.id
LEFT OUTER JOIN tbc_books as tb on ms.id= tb.subject_id
WHERE ms.id = $1 `, [subjectId]);

        if (result.rows.length === 0) {
            return responseHandler(res, 404, 'Subject not found');
        }
        responseHandler(res, 200, 'Subject fetched', result.rows[0]);
    } catch (error) {
        responseHandler(res, 400, 'Error fetching subject', null, error);
    }
};

// Get Subject by Class Level
const getSubjectByClass = async (req, res) => {
    /* #swagger.tags = ['Subjects'] */
    /* #swagger.security = [{'Bearer': []}] */
    const { class_id } = req.query;
   
    try {
        if (!class_id) {
            return responseHandler(res, 400, 'class_id query parameter is required');
        }

        const result = await pool.query(
            "SELECT * FROM mst_subjects WHERE class_level = $1",
            [class_id]
        );

        if (result.rows.length === 0) {
            return responseHandler(res, 404, 'No subjects found for the provided class_id');
        }

        return responseHandler(res, 200, 'Subjects fetched by class_id', result.rows);
    } catch (error) {
        console.error('Error fetching subject by class_id:', error);
        return responseHandler(res, 500, 'Error fetching subject', null, error);
    }
};

// Update Subject
const updateSubject = async (req, res) => {
    /* #swagger.tags = ['Subjects'] */
    /* #swagger.security = [{'Bearer': []}] */
    try {
        const { id } = req.params;
        const subjectId = parseInt(id); // Ensure id is an integer
        const { name, class_level, district, book_type, medium } = req.body;

        const updatedSubject = await pool.query(
            "UPDATE mst_subjects SET name = $1, class_level = $2, district_id=$3, book_type=$4, medium=$5  WHERE id = $6 RETURNING *",
            [name, class_level, district, book_type,medium, subjectId]
        );

        if (updatedSubject.rows.length === 0) {
            return responseHandler(res, 404, 'Subject not found');
        }
        responseHandler(res, 200, 'Subject updated successfully', updatedSubject.rows[0]);
    } catch (error) {
        responseHandler(res, 400, 'Error updating subject', null, error);
    }
};

// Delete Subject
const deleteSubject = async (req, res) => {
    /* #swagger.tags = ['Subjects'] */
    /* #swagger.security = [{'Bearer': []}] */
    try {
        const { id } = req.params;
        const subjectId = parseInt(id); // Ensure id is an integer
        const deletedSubject = await pool.query("DELETE FROM mst_subjects WHERE id = $1 RETURNING *", [subjectId]);

        if (deletedSubject.rows.length === 0) {
            return responseHandler(res, 404, 'Subject not found');
        }
        responseHandler(res, 200, 'Subject deleted successfully', deletedSubject.rows[0]);
    } catch (error) {
        responseHandler(res, 400, 'Error deleting subject', null, error);
    }
};

const getSubjectByDistrict = async (req, res) => {
    /* #swagger.tags = ['Subjects'] */
    /* #swagger.security = [{'Bearer': []}] */
    try {
        const { district_id } = req.params;
        const districtId = parseInt(district_id); // Ensure district_id is an integer
        const result = await pool.query("SELECT * FROM mst_subjects WHERE district_id = $1", [districtId]);

        if (result.rows.length === 0) {
            return responseHandler(res, 404, 'Subject not found');
        }
        responseHandler(res, 200, 'Subject fetched By District', result.rows[0]);
    } catch (error) {
        responseHandler(res, 400, 'Error fetching subject', null, error);
    }
}

const xmlImportData = async (req, res) => {
    /* #swagger.tags = ['Upload XML'] */
    /* #swagger.consumes = ['multipart/form-data']
     #swagger.parameters['file'] = {
             name: "file",
             in: "formData",
             description: "file to upload",
             required: false,
             type: "file"
           }
     */
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Please upload an .xlsx file" });
        }

        // Read the uploaded .xlsx file
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!sheetData.length) {
            return res.status(400).json({ error: "Uploaded file is empty" });
        }

        // Extract relevant fields
        const subjects = sheetData.map((row) => [
            row.name,
            row.class_level,
            row.district_id || null, // Handle NULL values
            row.book_type || null,
            row.medium || null,
        ]);

        // Bulk insert query using pg-format
        const query = `
          INSERT INTO mst_subjects (name, class_level, district_id, book_type,medium)
          VALUES %L
          RETURNING *;
        `;
        const formattedQuery = format(query, subjects);
        const result = await pool.query(formattedQuery);

        // Delete file after processing
        fs.unlinkSync(req.file.path);

        res.json({ message: "Data inserted successfully", insertedRows: result.rowCount });
    } catch (error) {
        console.error("Error inserting data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = { addSubject, xmlImportData, getSubjects, getSubjectById, getSubjectByClass, updateSubject, deleteSubject, getSubjectByDistrict, getSubjectsForOrder, getSubjectsForAssignPublisher };