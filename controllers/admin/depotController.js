const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");

const getDepot = async (req, res) => {
  /* #swagger.tags = ['Publisher Dashboard'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const result = await pool.query("SELECT * FROM public.mst_users WHERE role_id='3' and status='Approved' ORDER BY created_at DESC");
    responseHandler(res, 200, 'Depot fetched', result.rows);
  } catch (error) {
    responseHandler(res, 400, 'Error fetching Depot', null, error);
  }
};

const getDepotById = async (req, res) => {
  /* #swagger.tags = ['Publisher Dashboard'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { id } = req.params;
    const depotId = parseInt(id); // Ensure id is an integer

    const result = await pool.query("SELECT * FROM public.mst_users WHERE role_id='3' and user_id = $1 and status='Approved'", [depotId]);

    if (result.rows.length === 0) {
      return responseHandler(res, 404, 'Depot not found');
    }

    responseHandler(res, 200, 'Depot fetched', result.rows[0]);
  } catch (error) {
    responseHandler(res, 400, 'Error fetching Depot', null, error);
  }
};

module.exports = { getDepot, getDepotById };