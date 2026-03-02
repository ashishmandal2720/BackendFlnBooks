const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");

const getVerfiedUsersCount = async (req, res) => {
  try {
    const usersCount = await pool.query(
      `SELECT r.role_name , count(*) FROM public.mst_users m inner join mst_roles r on m.role_id = r.role_id group by role_name`
    );
    responseHandler(res, 200, "Users fetched", usersCount.rows);
  } catch (error) {
    responseHandler(res, 400, "Error Fetching Data", null, error);
  }
};

module.exports ={getVerfiedUsersCount}