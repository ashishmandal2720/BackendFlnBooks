const bcrypt = require("bcryptjs");
const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");

const getGovTeacher = async (req, res) => {
  /* #swagger.tags = ['Programmer'] */
  /* #swagger.security = [{"Bearer": []}] */
  const users = await pool.query(`SELECT
  u.*,
  t.*
FROM public.mst_users AS u
JOIN public.mst_teacher AS t
  ON t.teacher_code = u.column_value
WHERE u.role_id = 8
  AND u.table_name  = 'mst_teacher'
  AND u.column_name = 'teacher_code' ORDER BY created_at DESC`);
  responseHandler(res, 200, "Teachers fetched", users.rows);
};
const getPvtTeacher = async (req, res) => {
  /* #swagger.tags = ['Programmer'] */
  /* #swagger.security = [{"Bearer": []}] */
  const users = await pool.query(`SELECT
  u.*,
  t.*
FROM public.mst_users AS u
JOIN public.mst_udise_teacher AS t
  ON t.nat_tch_id = u.column_value
WHERE u.role_id = 10
  AND u.table_name  = 'mst_udise_teacher'
  AND u.column_name = 'nat_tch_id' ORDER BY created_at DESC`);
  responseHandler(res, 200, "Private Teachers fetched", users.rows);
};
const getSchools = async (req, res) => {
  /* #swagger.tags = ['Programmer'] */
  /* #swagger.security = [{"Bearer": []}] */
  const users = await pool.query(`SELECT
  u.*,
  t.*
FROM public.mst_users AS u
JOIN public.mst_schools AS t
  ON t.udise_sch_code = u.column_value
WHERE u.role_id = 7
  AND u.table_name  = 'mst_schools'
  AND u.column_name = 'udise_sch_code' ORDER BY created_at DESC`);
  responseHandler(res, 200, "School fetched", users.rows);
};
const getFilteredUsers = async (req, res) => {
  /* #swagger.tags = ['Programmer'] */
  /* #swagger.security = [{"Bearer": []}] */

  const { type, role_id, search } = req.query;

  if (!role_id) {
    return responseHandler(res, 400, "role_id is required.");
  }

  let tableName = "";
  let joinColumn = "";
  let searchColumn = "";

  // Determine table and join columns based on role_id
  switch (parseInt(role_id)) {
    case 8: // Government Teacher
      tableName = "mst_teachers";
      joinColumn = "teacher_code";
      break;
    case 10: // Private Teacher
      tableName = "mst_udise_teacher";
      joinColumn = "nat_tch_id";
      break;
    case 7: // School
      tableName = "mst_schools";
      joinColumn = "udise_sch_code";
      break;
    default:
      return responseHandler(res, 400, "Invalid role_id provided.");
  }

  // Determine search column based on 'type'
  switch (type) {
    case "by_name":
      // You'll need to know the actual name column for each table.
      // This is an assumption; adjust based on your actual table schemas.
      if (role_id == 8) {
        searchColumn = "t.teacher_name"; // Assuming 'teacher_name' for mst_teachers
      } else if (role_id == 10) {
        searchColumn = "t.teacher_name"; // Assuming 'teacher_name' for mst_udise_teacher
      } else if (role_id == 7) {
        searchColumn = "t.school_name"; // Assuming 'school_name' for mst_schools
      }
      break;
    case "by_code":
      searchColumn = `t.${joinColumn}`; // Code is the join column
      break;
    case "by_mobile":
      // You'll need to know the actual mobile column for each table.
      // This is an assumption; adjust based on your actual table schemas.
      if (role_id == 8) {
        searchColumn = "t.mobile_number"; // Assuming 'mobile_number' for mst_teachers
      } else if (role_id == 10) {
        searchColumn = "t.mobile_number"; // Assuming 'mobile_number' for mst_udise_teacher
      } else if (role_id == 7) {
        searchColumn = "t.contact_mobile"; // Assuming 'contact_mobile' for mst_schools
      }
      break;
    default:
      // If type is not provided or invalid, we will just filter by role_id
      // No specific searchColumn is needed in this case for the LIKE clause.
      break;
  }

  let query = `
    SELECT
      u.*,
      t.*
    FROM public.mst_users AS u
    JOIN public.${tableName} AS t
      ON t.${joinColumn} = u.column_value
    WHERE u.role_id = $1
      AND u.table_name = '${tableName}'
      AND u.column_name = '${joinColumn}'
  `;
  const queryParams = [role_id];

  if (search && searchColumn) {
    query += ` AND ${searchColumn} ILIKE $2`;
    queryParams.push(`%${search}%`);
  }

  query += ` ORDER BY created_at DESC`;

  try {
    const users = await pool.query(query, queryParams);
    responseHandler(
      res,
      200,
      `${tableName.replace("mst_", "")} fetched successfully`,
      users.rows
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    responseHandler(res, 500, "Error fetching users", null, error.message);
  }
};

const approveUser = async (req, res) => {
  /* #swagger.tags = ['Programmer'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return responseHandler(res, 400, "Invalid status");
    }
    const userResult = await pool.query(
      "SELECT * FROM mst_users WHERE user_id = $1",
      [id]
    );
    user = userResult.rows[0];
    if (!user) return responseHandler(res, 400, "User Not Found");
    if (
      user.role_id !== 4 &&
      user.role_id !== 5 &&
      user.role_id !== 6 &&
      user.role_id !== 7 &&
      user.role_id !== 8 &&
      user.role_id !== 10
    ) {
      return responseHandler(
        res,
        400,
        "You are not authorized to approve this user"
      );
    }
    await pool.query(
      "UPDATE mst_users SET status = $1, approved_by = $2 WHERE user_id = $3 AND  role_id in (4,5,6,7,8,10)",
      [status, req.user.user_id, id]
    );
    await pool.query(
      "INSERT INTO tbc_notifications (user_id, message) VALUES ($1, $2)",
      [id, `Your Account Has ${status} By Programmer.`]
    );
    responseHandler(res, 200, `User ${status}`);
  } catch (e) {
    responseHandler(res, 400, "Error approving user", null, e);
  }
};

const updatePassword = async (req, res) => {
  /* #swagger.tags = ['Programmer'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { user_id, password } = req.body;

    const userResult = await pool.query(
      "SELECT * FROM mst_users WHERE user_id = $1",
      [user_id]
    );

    if (!userResult.rows.length) {
      return responseHandler(res, 400, "User Not registered or Not Found");
    }

    const user = userResult.rows[0];
    if (
      user.role_id !== 4 &&
      user.role_id !== 5 &&
      user.role_id !== 6 &&
      user.role_id !== 7 &&
      user.role_id !== 8 &&
      user.role_id !== 10
    ) {
      return responseHandler(
        res,
        400,
        "You are not authorized to update this user"
      );
    } else {
      const hashedPassword = await bcrypt.hash(password, 12);
      await pool.query(
        "UPDATE mst_users SET password = $1 WHERE user_id = $2 AND role_id in (4,5,6,7,8,10) ",
        [hashedPassword, user_id]
      );
      responseHandler(res, 200, `Password updated successfully`);
    }
  } catch (e) {
    responseHandler(res, 400, "Password Updation Failed", null, e);
  }
};

const getSearchAndRegistrationStatus = async (req, res) => {
  /* #swagger.tags = ['Programmer'] */
  /* #swagger.security = [{"Bearer": []}] */

  const { type, role_id, search } = req.query;

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
    case 10: // Private Teacher
      tableName = "mst_udise_teacher";
      joinColumn = "nat_tch_id";
      searchColumn = "emp_name";
      userTableRoleId = 10;
      break;
    case 7: // School
      tableName = "mst_schools";
      joinColumn = "udise_sch_code";
      searchColumn = "school_name";
      userTableRoleId = 7;
      break;
    case 4:
      tableName = "mst_deo";
      joinColumn = "district_cd";
      searchColumn = "deo_name";
      userTableRoleId = 4;
      break;
    case 5:
      tableName = "mst_beo";
      joinColumn = "block_cd";
      searchColumn = "beo_name";
      userTableRoleId = 5;
      break;
    case 6:
      tableName = "mst_cac";
      joinColumn = "cluster_cd";
      searchColumn = "cac_name";
      userTableRoleId = 6;
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
  if ([10].includes(userTableRoleId)) {
    // Assumes both mst_teacher and mst_udise_teacher have an 'udise_sch_code' column
    schoolJoin = `
      LEFT JOIN public.mst_schools AS s
        ON t.udise_sch_code::text = s.udise_sch_code::text
    `;
    schoolSelect = `,
      s.school_name AS school_name
    `;
  }

  // Allow alternative search column via 'type'
  if (type) {
    switch (type) {
      case "1":
        if (userTableRoleId === 8) searchColumn = "name_eng";
        else if (userTableRoleId === 4) searchColumn = "deo_name";
        else if (userTableRoleId === 5) searchColumn = "beo_name";
        else if (userTableRoleId === 6) searchColumn = "cac_name";
        else if (userTableRoleId === 7) searchColumn = "school_name";
        else if (userTableRoleId === 10) searchColumn = "emp_name";
        break;
      case "2":
        if (userTableRoleId === 4) searchColumn = "district_cd::TEXT";
        else if (userTableRoleId === 5) searchColumn = "block_cd::TEXT";
        else if (userTableRoleId === 6) searchColumn = "cluster_cd::TEXT";
        else searchColumn = joinColumn;
        break;
      case "3":
        if (userTableRoleId === 8) searchColumn = "mobile_no::TEXT";
        else if (userTableRoleId === 4) searchColumn = "mobile::TEXT";
        else if (userTableRoleId === 5) searchColumn = "mobile::TEXT";
        else if (userTableRoleId === 6) searchColumn = "cac_mobile";
        else if (userTableRoleId === 10) searchColumn = "mobile";
        else
          return responseHandler(
            res,
            400,
            "School cannot be fetched by contact number"
          );
        break;
    }
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
      ON u.column_value::TEXT = t.${joinColumn}::text
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
      `${tableName.replace("mst_", "")} data with registration status fetched successfully`,
      result.rows
    );
  } catch (error) {
    console.error("Error fetching data with registration status:", error);
    responseHandler(
      res,
      500,
      "Error fetching data with registration status",
      null,
      error.message
    );
  }
};

const updateUsers = async (req, res) => {
  /* #swagger.tags = ['Programmer'] */
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
      if(name && name !== null && name !== undefined && name !== "") {
        if(parseInt(role) === 4 || parseInt(role) === 5){
        result = await pool.query(
          "UPDATE mst_users SET contact_number = $1, name = $3 , email= $5  WHERE user_id = $2 and role_id = $4",
          [mobile, uid, name, role,mobile]
        );
      }
       if(parseInt(role) === 6 ||  parseInt(role) === 8  || parseInt(role) === 10){
        result = await pool.query(
          "UPDATE mst_users SET contact_number = $1, name = $3 WHERE user_id = $2 and role_id = $4",
          [mobile, uid, name, role]
        );
      }
      
      }
      if(name === null || name === undefined || name === ""){
        result = await pool.query(
          "UPDATE mst_users SET contact_number = $1 WHERE user_id = $2 and role_id = $3",
          [mobile, uid, role]
        );
      }
      if(parseInt(role) === 10) {
        result = await pool.query(
          "UPDATE mst_udise_teacher SET mobile = $1 WHERE nat_tch_id = $2",
          [mobile, columnValue]
        );
      }
      if(parseInt(role) === 4) {
        result = await pool.query(
          "UPDATE mst_deo SET mobile = $1, deo_name=$3 WHERE district_cd::text = $2",
          [mobile, columnValue,name]
        );
      }
      if(parseInt(role) === 5) {
        result = await pool.query(
          "UPDATE mst_beo SET mobile = $1, beo_name=$3 WHERE block_cd::text = $2",
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

const addTeacher = async (req, res) => {
    /* #swagger.tags = ['Teachers'] */
    /* #swagger.security = [{'Bearer': []}] */
    try {
        const { udise_id, teacher_code, name_eng, designation_id, mobile_no } = req.body;

        // Validate required fields
        if (!udise_id || !teacher_code || !name_eng || !designation_id || !mobile_no) {
            return responseHandler(res, 400, 'All fields are required');
        }

        // Get the next ID by finding the maximum existing ID and adding 1
        const idResult = await pool.query("SELECT COALESCE(MAX(id), 0) + 1 AS new_id FROM mst_teacher");
        const newId = idResult.rows[0].new_id;

        // Get designation details from mst_teacher table
        const designationResult = await pool.query(
            `SELECT designation_name_eng 
             FROM mst_teacher 
             WHERE designation_id = $1 
             LIMIT 1`,
            [designation_id]
        );

        if (designationResult.rows.length === 0) {
            return responseHandler(res, 400, 'Invalid designation');
        }

        const { designation_name_eng } = designationResult.rows[0];

        // Insert the new teacher
        const newTeacher = await pool.query(
            `INSERT INTO mst_teacher (
                id, udise_id, current_udise_id, teacher_code, name_hin, name_eng,
                designation_id, designation_name_eng, designation_name_hin, mobile_no,
                status, role, previous_udise_id, transfered
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
            [
                newId,
                udise_id,
                udise_id, // current_udise_id same as udise_id
                teacher_code,
                null, // name_hin null
                name_eng,
                designation_id,
                designation_name_eng,
                null,
                mobile_no,
                true, // status true
                4, // role 4
                null, // previous_udise_id null
                false // transfered false
            ]
        );

        responseHandler(res, 201, 'Teacher added successfully', newTeacher.rows[0]);
    } catch (error) {
        console.error('Error in addTeacher:', error);
        responseHandler(res, 400, 'Error adding teacher', null, error);
    }
};

const addContractTeacher = async (req, res) => {
    /* #swagger.tags = ['Contract Teachers'] */
    /* #swagger.security = [{'Bearer': []}] */
    try {
        const { udise_sch_code, nat_tch_id, emp_name, mobile } = req.body;

        // Validate required fields
        if (!udise_sch_code || !nat_tch_id || !emp_name || !mobile) {
            return responseHandler(res, 400, 'All fields are required');
        }

        // Get the next ID by finding the maximum existing ID and adding 1
        const idResult = await pool.query("SELECT COALESCE(MAX(id), 0) + 1 AS new_id FROM mst_udise_teacher");
        const newId = idResult.rows[0].new_id;

        // Insert the new contract teacher with only the necessary fields
        const newTeacher = await pool.query(
            `INSERT INTO mst_udise_teacher (
                id, 
                udise_sch_code, 
                emp_name,
                mobile,
                nat_tch_id
            ) VALUES (
                $1, $2, $3, $4, $5
            ) RETURNING *`,
            [
                newId,
                udise_sch_code,
                emp_name,
                mobile,
                nat_tch_id
            ]
        );

        responseHandler(res, 201, 'Teacher added successfully', newTeacher.rows[0]);
    } catch (error) {
        console.error('Error in addTeacher:', error);
        responseHandler(res, 400, 'Error adding  teacher', null, error);
    }
};
module.exports = {
  approveUser,
  updatePassword,
  getGovTeacher,
  getPvtTeacher,
  getSchools,
  getFilteredUsers,
  getSearchAndRegistrationStatus,
  updateUsers,
  addTeacher,
  addContractTeacher
 
};
