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
JOIN public.mst_teachers AS t
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
      return responseHandler(res, 400, "User Not Found");
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
  let userTableRoleId = null; // To match role_id in mst_users for registration check

  // Determine table, join columns, and associated user role_id
  switch (parseInt(role_id)) {
    case 8: // Government Teacher
      tableName = "mst_teacher";
      joinColumn = "teacher_code";
      searchColumn = "teacher_name"; // Default search by name if type is not specified
      userTableRoleId = 8;
      break;
    case 4: // Government Teacher
      return responseHandler(
        res,
        400,
        "Currently you can not search for this role (under development)"
      );
    case 5: // Government Teacher
      return responseHandler(
        res,
        400,
        "Currently you can not search for this role (under development)"
      );
    case 6: // Government Teacher
      return responseHandler(
        res,
        400,
        "Currently you can not search for this role (under development)"
      );
    case 10: // Private Teacher
      tableName = "mst_udise_teacher";
      joinColumn = "nat_tch_id";
      searchColumn = "teacher_name"; // Default search by name if type is not specified
      userTableRoleId = 10;
      break;
    case 7: // School
      tableName = "mst_schools";
      joinColumn = "udise_sch_code::text";
      searchColumn = "school_name"; // Default search by name if type is not specified
      userTableRoleId = 7;
      break;
    default:
      return responseHandler(res, 400, "Invalid role_id provided.");
  }

  // Refine searchColumn based on 'type' if provided
  if (type) {
    switch (type) {
      case "1":
        // Ensure these column names are correct for your tables
        if (role_id == 8) {
          searchColumn = "name_eng"; // Assuming 'teacher_name' for mst_teachers
        } else if (role_id == 10) {
          searchColumn = "emp_name";
        } else if (role_id == 7) {
          searchColumn = "school_name";
        }
        break;
      case "2":
        searchColumn = joinColumn; // Code is the join column for the main table
        break;
      case "3":
        // Ensure these column names are correct for your tables
        if (role_id == 8) {
          searchColumn = "mobile_no";
        } else if (role_id == 10) {
          searchColumn = "mobile";
        } else if (role_id == 7) {
          return responseHandler(
            res,
            400,
            "School Can not be fetched by contact Number",
            null,
            "School Can not be fetched by contact Number"
          );
        }
        break;
      default:
        // Keep the default searchColumn if type is invalid
        break;
    }
  }

  let query = `
    SELECT
      t.*,
      CASE
        WHEN u.user_id IS NOT NULL THEN TRUE
        ELSE FALSE
      END AS registered
    FROM public.${tableName} AS t
    LEFT JOIN public.mst_users AS u
      ON u.column_value = t.${joinColumn}
      AND u.table_name = '${tableName}'
      AND u.column_name = '${joinColumn}'
      
      AND u.role_id = $1 -- Match role_id from mst_users for accurate registration status
    WHERE TRUE -- A dummy WHERE clause to easily append conditions
  `;

  const queryParams = [userTableRoleId]; // Always include the role_id for the LEFT JOIN condition

  if (search && searchColumn) {
    if (parseInt(type) === 3 && parseInt(role_id) === 8) {
      query += ` AND t.${searchColumn}::TEXT ILIKE $2`;
    } else {
      query += ` AND t.${searchColumn} ILIKE $2`;
    }
    queryParams.push(`%${search}%`);
  }
  query += ` ORDER BY registered DESC LIMIT 100`; // Order by the main table's created_at

  try {
    const result = await pool.query(query, queryParams);
    responseHandler(
      res,
      200,
      `${tableName.replace(
        "mst_",
        ""
      )} data with registration status fetched successfully`,
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

module.exports = {
  approveUser,
  updatePassword,
  getGovTeacher,
  getPvtTeacher,
  getSchools,
  getFilteredUsers,
  getSearchAndRegistrationStatus,
};
