const bcrypt = require("bcryptjs");
const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");


const getSearchTeacher = async (req, res) => {
  /* #swagger.tags = ['DEO Transfer'] */
  /* #swagger.security = [{"Bearer": []}] */

  const { type,search } = req.query;
  const role_id = 8;
  if (!role_id) {
    return responseHandler(res, 400, "role_id is required.");
  }

  let tableName = "";
  let joinColumn = "";
  let searchColumn = "";
  let userTableRoleId = null; // for matching mst_users.role_id
  // These will drive our extra school‐join logic:
  let schoolJoin = "";
  let schoolSelect = "";

  // Determine your base table & join‐columns
  switch (parseInt(role_id, 10)) {

    case 8: // Government Teacher
      tableName = "mst_teacher";
      joinColumn = "teacher_code";
      searchColumn = "teacher_name";
      userTableRoleId = 8;
      break;
      
    default:
      return responseHandler(res, 400, "Invalid role_id provided.");
  }

  // If we're in one of the teacher roles, join in the school master table
  if ([8].includes(userTableRoleId)) {
    // Assumes both mst_teacher and mst_udise_teacher have an 'udise_sch_code' column
    schoolJoin = `
      LEFT JOIN public.mst_schools AS s
        ON t.current_udise_id::text = s.udise_sch_code::text
    `;
    schoolSelect = `,
      s.school_name AS school_name
    `;
  }

  if (type === "1") {
      searchColumn = "teacher_code";
  }
  if(type === "2"){
      searchColumn = "current_udise_id::text";
  }

  // Build your query — inject the schoolJoin & schoolSelect where appropriate
  let query = `
    SELECT
      u.user_id,
      t.*${schoolSelect},
      CASE WHEN u.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS registered
    FROM public.${tableName} AS t
    ${schoolJoin}
    LEFT JOIN public.mst_users AS u
      ON u.column_value = t.${joinColumn}
      AND u.table_name   = '${tableName}'
      AND u.column_name  = '${joinColumn}'
      AND u.role_id      = $1
    WHERE TRUE
  `;

  const queryParams = [userTableRoleId];

  if (search) {
    query += ` AND t.${searchColumn} ILIKE $2`;
    queryParams.push(`%${search}%`);
  }

  query += ` ORDER BY registered DESC LIMIT 100`;

  try {
    const result = await pool.query(query, queryParams);
    responseHandler(
      res,
      200,
      `${tableName.replace("mst_", "")} data fetched successfully`,
      result.rows
    );
  } catch (error) {
    console.error("Error fetching data:", error);
    responseHandler(
      res,
      500,
      "Error fetching data",
      null,
      error.message
    );
  }
};
const getSchools = async (req, res) => {
  /* #swagger.tags = ['DEO Transfer'] */
  /* #swagger.security = [{"Bearer": []}] */
  try{
  const { udise } = req.query;
  const users = await pool.query(`SELECT
  t.*
FROM public.mst_schools AS t
WHERE t.udise_sch_code = $1`,[udise]);
  responseHandler(res, 200, "School fetched", users.rows[0]);
  }catch (error) {
    console.error("Error fetching data:", error);
    responseHandler(
      res,
      500,
      "Error fetching data",
      null,
      error.message
    );
  }
};

const updateUsers = async (req, res) => {
  /* #swagger.tags = ['DEO Transfer'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { id,code,role, mobile,name} = req.body;

    if ( !role || !mobile) {
      return responseHandler(res, 400, "Missing required fields");
    }

    const uid = (id !== ""&&id !== null&&id !== undefined)?parseInt(id):null;

    const checkQuery = `
      SELECT * FROM mst_users WHERE user_id = $1 and role_id = $2 LIMIT 1
    `;

    const checkResult = await pool.query(checkQuery, [uid, parseInt(role)]);

    let result;
    if (checkResult.rowCount > 0) {
      const columnValue = checkResult.rows[0].column_value
      result = await pool.query(
        "UPDATE mst_users SET contact_number = $1 WHERE user_id = $2 and role_id = $3",
        [mobile, uid, role]
      );
      if(parseInt(role) === 10) {
        result = await pool.query(
          "UPDATE mst_udise_teacher SET mobile = $1 WHERE nat_tch_id = $2",
          [mobile, columnValue]
        );
      }
      if(parseInt(role) === 4) {
        result = await pool.query(
          "UPDATE mst_deo SET mobile = $1, deo_name=$3 WHERE district_cd = $2",
          [mobile, columnValue,name]
        );
      }
      if(parseInt(role) === 5) {
        result = await pool.query(
          "UPDATE mst_beo SET mobile = $1, beo_name=$3 WHERE block_cd = $2",
          [mobile, columnValue,name]
        );
      }
      if(parseInt(role) === 6) {
        result = await pool.query(
          "UPDATE mst_cac SET cac_mobile = $1,cac_name=$3 WHERE cluster_cd = $2",
          [mobile, columnValue,name]
        );
      }
      if(parseInt(role) === 7) {
        result = await pool.query(
          "UPDATE mst_schools SET sch_mobile = $1 WHERE udise_sch_code = $2",
          [mobile, columnValue]
        );
      }
      if(parseInt(role) === 8) {
        result = await pool.query(
          "UPDATE mst_teacher SET mobile_no = $1 WHERE teacher_code = $2",
          [mobile, columnValue]
        );
      }  
    } else {
      if(parseInt(role) === 10) {
        result = await pool.query(
          "UPDATE mst_udise_teacher SET mobile = $1 WHERE nat_tch_id = $2",
          [mobile, code]
        );
      }
      if(parseInt(role) === 4) {
        result = await pool.query(
          "UPDATE mst_deo SET mobile = $1, deo_name=$3 WHERE district_cd = $2",
          [mobile, code,name]
        );
      }
      if(parseInt(role) === 5) {
        result = await pool.query(
          "UPDATE mst_beo SET mobile = $1, beo_name=$3 WHERE block_cd = $2",
          [mobile, code,name]
        );
      }
      if(parseInt(role) === 6) {
        result = await pool.query(
          "UPDATE mst_cac SET cac_mobile = $1,cac_name=$3 WHERE cluster_cd = $2",
          [mobile, code,name]
        );
      }
      if(parseInt(role) === 7) {
        result = await pool.query(
          "UPDATE mst_schools SET sch_mobile = $1 WHERE udise_sch_code = $2",
          [mobile, code]
        );
      }
      if(parseInt(role) === 8) {
        result = await pool.query(
          "UPDATE mst_teacher SET mobile_no = $1 WHERE teacher_code = $2",
          [mobile, code]
        );
      }
    }
    
    if (result?.rowCount === 0) {
      return responseHandler(res, 400, "User Not Found");
    }
    responseHandler(res, 200, "User Details Updated Successfully");
  } catch (e) {
    console.error("Error updating User Details", e);
    responseHandler(res, 400, "Error updating User Details", null, e);
  }
};
const updateTeacherTransfer = async (req, res) => {
  /* #swagger.tags = ['DEO Transfer'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { teacher_code, new_udise_id } = req.body;

    if (!teacher_code || !new_udise_id) {
      return responseHandler(res, 400, "Teacher code and UDISE ID are required");
    }
    // Check if the teacher exists
    const teacherCheckResult = await pool.query(
      `SELECT * FROM mst_teacher WHERE teacher_code = $1`,
      [teacher_code]
    );

    if(teacherCheckResult.rowCount === 0) {
      return responseHandler(res, 404, "Teacher not found");
    }
    const currentUdiseId = teacherCheckResult.rows[0].current_udise_id;
    await pool.query('BEGIN');
    try {
      const teacherUpdateResult = await pool.query(
        `UPDATE mst_teacher SET current_udise_id = $1, transfered = true, previous_udise_id = $2 
         WHERE teacher_code = $3 RETURNING *`,
        [new_udise_id, currentUdiseId,teacher_code]
      );

      if (teacherUpdateResult.rowCount === 0) {
        await pool.query('ROLLBACK');
        return responseHandler(res, 404, "Teacher not found");
      }

      await pool.query('COMMIT');
      
      return responseHandler(res, 200, "Teacher transfer successful", {
        teacher_updated: true,
        new_udise_id,
        teacher_code
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      console.error("Transfer error:", error);
      return responseHandler(res, 500, "Teacher transfer failed");
    }

  } catch (e) {
    console.error("System error:", e);
    return responseHandler(res, 500, "Operation failed");
  }
};

const getUdiseCode = async (req, res) => {
  /* #swagger.tags = ['DEO Transfer'] */
  /* #swagger.security = [{"Bearer": []}] */

  const {search} = req.query;
  try {
    const query= `select udise_sch_code ,school_name from mst_schools where udise_sch_code::text   ilike $1 limit 10;`
    const result = await pool.query(query, [`%${search}%`]);
    responseHandler(
      res,
      200,
      `data fetched successfully`,
      result.rows
    );
  } catch (error) {
    console.error("Error fetching data:", error);
    responseHandler(
      res,
      500,
      "Error fetching data",
      null,
      error.message
    );
  }
};


const getTransferCount = async (req, res) => {
  /* #swagger.tags = ['DEO Transfer'] */
  /* #swagger.security = [{"Bearer": []}] */

  try {
    const query= `select count(*) as count from mst_teacher where transfered = true;`
    const result = await pool.query(query);
    responseHandler(
      res,
      200,
      `data fetched successfully`,
      result.rows[0]
    );
  } catch (error) {
    console.error("Error fetching data:", error);
    responseHandler(
      res,
      500,
      "Error fetching data",
      null,
      error.message
    );
  }
};


const getTransferHistory = async (req, res) => {
  /* #swagger.tags = ['DEO Transfer'] */
  /* #swagger.security = [{"Bearer": []}] */

  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    const query = `
      SELECT 
        teacher_code, 
        name_eng, 
        previous_udise_id, 
        current_udise_id,
        COUNT(*) OVER() as total_count
      FROM mst_teacher 
      WHERE transfered = true
      ORDER BY teacher_code
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    
    responseHandler(
      res,
      200,
      `Data fetched successfully`,
      {
        data: result.rows,
        pagination: {
          total: result.rows[0]?.total_count || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil((result.rows[0]?.total_count || 0) / limit)
        }
      }
    );
  } catch (error) {
    console.error("Error fetching data:", error);
    responseHandler(
      res,
      500,
      "Error fetching data",
      null,
      error.message
    );
  }
};



module.exports = {

  getSchools,
  getSearchTeacher,
  updateUsers,
  updateTeacherTransfer,
  getUdiseCode,
  getTransferCount,
  getTransferHistory
 
};
