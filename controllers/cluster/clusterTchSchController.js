const bcrypt = require('bcryptjs');
const { pool } = require('../../config/db');
const responseHandler = require('../../utils/responseHandler');

const getGovTeacher = async (req, res) => {
  /* #swagger.tags = ['Programmer'] */
  /* #swagger.security = [{"Bearer": []}] */
  const { cluster_id } = req.params;
  const users = await pool.query(`SELECT
  u.*,
  t.*
FROM public.mst_users AS u
JOIN public.mst_teachers AS t
  ON t.teacher_code = u.column_value
JOIN public.mst_schools AS s
  ON s.udise_sch_code = t.current_udise_id
WHERE u.role_id = 8 and s.cluster_cd = $1
  AND u.table_name  = 'mst_teacher'
  AND u.column_name = 'teacher_code' ORDER BY created_at DESC`,[cluster_id]);
  responseHandler(res, 200, 'Teachers fetched', users.rows);
};
const getPvtTeacher = async (req, res) => {
  /* #swagger.tags = ['Programmer'] */
  /* #swagger.security = [{"Bearer": []}] */
  const { cluster_id } = req.params;
  const users = await pool.query(`SELECT
  u.*,
  t.*
FROM public.mst_users AS u
JOIN public.mst_udise_teacher AS t
  ON t.nat_tch_id = u.column_value
JOIN public.mst_schools AS s
  ON s.udise_sch_code = t.udise_sch_code
WHERE u.role_id = 10 and s.cluster_cd = $1
  AND u.table_name  = 'mst_udise_teacher'
  AND u.column_name = 'nat_tch_id' ORDER BY created_at DESC`,[cluster_id]);
  responseHandler(res, 200, 'Private Teachers fetched', users.rows);
};
const getSchools = async (req, res) => {
  /* #swagger.tags = ['Programmer'] */
  /* #swagger.security = [{"Bearer": []}] */
  const { cluster_id } = req.params;
  const users = await pool.query(`SELECT
  u.*,
  t.*
FROM public.mst_users AS u
JOIN public.mst_schools AS t
  ON t.udise_sch_code = u.column_value
WHERE u.role_id = 10 and t.cluster_cd = $1
  AND u.table_name  = 'mst_schools'
  AND u.column_name = 'udise_sch_code' ORDER BY created_at DESC`,[cluster_id]);
  responseHandler(res, 200, 'School fetched', users.rows);
};


const approveUser = async (req, res) => {
  /* #swagger.tags = ['Programmer'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return responseHandler(res, 400, 'Invalid status');
    }
    const userResult = await pool.query(
      'SELECT * FROM mst_users WHERE user_id = $1',
      [id]
    );
    user = userResult.rows[0];
    if (!user) return responseHandler(res, 400, 'User Not Found');
    if (user.role_id !== 7 && user.role_id !== 8 && user.role_id !== 10) {
      return responseHandler(res, 400, 'You are not authorized to approve this user');
    }
    await pool.query('UPDATE mst_users SET status = $1, approved_by = $2 WHERE user_id = $3 AND  role_id in (7,8,10)', [
      status,
      req.user.user_id,
      id,
    ]);
    await pool.query(
      "INSERT INTO tbc_notifications (user_id, message) VALUES ($1, $2)",
      [id, `Your Account Has ${status} By Programmer.`]
    );
    responseHandler(res, 200, `User ${status}`);
  } catch (e) {
    responseHandler(res, 400, 'Error approving user', null, e);
  };
}

const updatePassword = async (req, res) => {
  /* #swagger.tags = ['Programmer'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { user_id,password } = req.body;

    const userResult = await pool.query(
      'SELECT * FROM mst_users WHERE user_id = $1',
      [user_id]
    );

    if (!userResult.rows.length) {return responseHandler(res, 400, 'User Not Found');}

    const user = userResult.rows[0];
    if (user.role_id !== 7 && user.role_id !== 8 && user.role_id !== 10) {
      return responseHandler(res, 400, 'You are not authorized to update this user');
    }
    else{
      const hashedPassword = await bcrypt.hash(password, 12);
      await pool.query('UPDATE mst_users SET password = $1 WHERE user_id = $2 AND role_id in (7,8,10)', [
        hashedPassword,
        user_id,
      ]);
      responseHandler(res, 200, `Password updated successfully`);
    }
  } catch (e) {
    responseHandler(res, 400, 'Password Updation Failed', null, e);
  };
}

module.exports = { approveUser, updatePassword,getGovTeacher,getPvtTeacher,getSchools };
