const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");
// Get All Publishers
const getPublishers = async (req, res) => {
  /* #swagger.tags = ['Publishers'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const result = await pool.query("SELECT * FROM public.mst_users WHERE role_id='2' ORDER BY created_at DESC");
    responseHandler(res, 200, 'Publishers fetched', result.rows);
  } catch (error) {
    responseHandler(res, 400, 'Error fetching publishers', null, error);
  }
};

// Get Single Publisher
const getPublisherById = async (req, res) => {
  /* #swagger.tags = ['Publishers'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { id } = req.params;
    const publisherId = parseInt(id); // Ensure id is an integer

    const result = await pool.query("SELECT * FROM public.mst_users WHERE role_id='2' and user_id = $1", [publisherId]);

    if (result.rows.length === 0) {
      return responseHandler(res, 404, 'Publisher not found');
    }

    responseHandler(res, 200, 'Publisher fetched', result.rows[0]);
  } catch (error) {
    responseHandler(res, 400, 'Error fetching publisher', null, error);
  }
};

const getAllPublishers = async (req, res) => {
  /* #swagger.tags = ['Publishers'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const result = await pool.query("SELECT * FROM mst_publisher ");
    responseHandler(res, 200, 'Publishers fetched', result.rows);
  } catch (error) {
    responseHandler(res, 400, 'Error fetching publishers', null, error);
  }
};


module.exports = { getPublishers, getPublisherById,getAllPublishers };