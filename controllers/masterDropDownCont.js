const { pool } = require("../config/db");
const responseHandler = require("../utils/responseHandler");


const getDepotData = async (req, res) => {
  /* #swagger.tags = ['masterDropDown'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const query = `SELECT * FROM mst_depot`;
    const result = await pool.query(query);
    res.status(200).json({
      success: true,
      message: 'District fetched successfully',
      count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    console.error("Error fetching districts:", error);
    res.status(500).json({ message: 'Error fetching districts', error });
  }
};
const  getDistrictData= async (req, res) => {
  /* #swagger.tags = ['masterDropDown'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const query = `SELECT id, district_cd, district_name FROM mst_district`;
    const result = await pool.query(query);
    res.status(200).json({
      success: true,
      message: 'District fetched successfully',
      count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    console.error("Error fetching districts:", error);
    res.status(500).json({ message: 'Error fetching districts', error });
  }
};

const getBlockData = async (req, res) => {
  /* #swagger.tags = ['masterDropDown'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { district_cd } = req.query;
    if (!district_cd) {
      return res.status(400).json({ message: 'district_cd is required' });
    }

    const query = `
            SELECT id, district_cd, block_cd, block_name 
            FROM mst_block 
            WHERE district_cd = $1
        `;

    const result = await pool.query(query, [district_cd]);
    res.status(200).json({
      success: true,
      message: 'Block fetched successfully',
      count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    console.error("Error fetching blocks:", error);
    res.status(500).json({ message: 'Error fetching blocks', error });
  }
};


const getClusterData = async (req, res) => {
  /* #swagger.tags = ['masterDropDown'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { block_cd } = req.query;
    if (!block_cd) {
      return res.status(400).json({ message: 'block_cd is required' });
    }

    const query = `
            SELECT id, district_cd, district_name, block_cd, block_name, cluster_cd, cluster_name 
            FROM mst_cluster 
            WHERE block_cd = $1
        `;

    const result = await pool.query(query, [block_cd]);
    res.status(200).json({
      success: true,
      message: 'Cluster fetched successfully',
      count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    console.error("Error fetching clusters:", error);
    res.status(500).json({ message: 'Error fetching clusters', error });
  }
};

const getAllMedium = async (req, res) => {
  /* #swagger.tags = ['Publishers'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const result = await pool.query("SELECT * FROM mst_medium ");
    responseHandler(res, 200, 'Medium data fetched', result.rows, null,result.rowCount,);
  } catch (error) {
    responseHandler(res, 400, 'Error fetching Medium', null, error);
  }
};

const getAllDeoList = async (req, res) => {
  /* #swagger.tags = ['Publishers'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    let { district_cd } = req.body;

    let baseQuery = "SELECT mst_deo.*, mst_users.user_id as user_id FROM mst_users LEFT JOIN mst_deo ON mst_users.column_value::bigint = mst_deo.mobile";
    let conditions = [];
    let values = [];
    let index = 1;

    if (district_cd) {
      const districtCds = Array.isArray(district_cd)
        ? district_cd
        : district_cd.split(',').map(id => id.trim());

      const placeholders = districtCds.map(() => `$${index++}`).join(', ');
      conditions.push(`mst_deo.district_cd IN (${placeholders})`);
      values.push(...districtCds);
    }

    if (conditions.length > 0) {
      baseQuery += " WHERE " + conditions.join(" AND ");
    }
    // console.log("baseQuery", baseQuery);
    const result = await pool.query(baseQuery, values);
    responseHandler(res, 200, 'Deo data fetched', result.rows, null, result.rowCount);
  } catch (error) {
    responseHandler(res, 400, 'Error fetching Deo list', null, error);
  }
};


const getAllCacList = async (req, res) => {
  /* #swagger.tags = ['Publishers'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    let { district_cd, block_cd } = req.body;

    let baseQuery = `SELECT mst_cac.*, mst_users.user_id as user_id 
  FROM mst_users 
  LEFT JOIN mst_cac 
    ON CASE 
         WHEN mst_users.column_value ~ '^\\d+$' 
         THEN mst_users.column_value::bigint 
         ELSE NULL 
       END = mst_cac.cluster_cd`;
    let conditions = [];
    let values = [];
    let index = 1;

    if (district_cd) {
      // Support comma-separated string or array
      const districtCds = Array.isArray(district_cd)
        ? district_cd
        : district_cd.split(',').map(id => id.trim());

      const placeholders = districtCds.map(() => `$${index++}`).join(', ');
      conditions.push(`district_cd IN (${placeholders})`);
      values.push(...districtCds);
    }

    if (block_cd) {
      conditions.push(`block_cd = $${index++}`);
      values.push(block_cd);
    }

    if (conditions.length > 0) {
      baseQuery += " WHERE " + conditions.join(" AND ");
    }

    const result = await pool.query(baseQuery, values);
    responseHandler(res, 200, 'CAC data fetched', result.rows, null, result.rowCount);
  } catch (error) {
    console.error("Error fetching CAC list:", error);
    responseHandler(res, 400, 'Error fetching CAC list', null, error);
  }
};

const getDivision = async (req, res) => {
  /* #swagger.tags = ['masterDropDown'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const query = `SELECT * FROM mst_division`;
    const result = await pool.query(query);
    res.status(200).json({
      success: true,
      message: 'Division fetched successfully',
      count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    console.error("Error fetching division:", error);
    res.status(500).json({ message: 'Error fetching division', error });
  }
};

const getClass = async (req, res) => {
  /* #swagger.tags = ['masterDropDown'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const query =`SELECT DISTINCT class_level FROM mst_subjects ORDER BY class_level;`;
    const result = await pool.query(query);
    res.status(200).json({
      success: true,
      message: 'Class fetched successfully',
      count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    console.error("Error fetching class:", error);
    res.status(500).json({ message: 'Error fetching class', error });
  }
};

const getDesignationDropdown = async (req, res) => {
    /* #swagger.tags = ['Teachers'] */
    /* #swagger.security = [{'Bearer': []}] */
    /* #swagger.description = 'Get distinct designations from teachers table for dropdown' */
    try {
        // Get only non-null designations and exclude empty values
        const result = await pool.query(`
            SELECT DISTINCT 
                designation_id, 
                designation_name_eng 
            FROM mst_teacher 
            WHERE designation_id IS NOT NULL 
            AND designation_name_eng IS NOT NULL
            AND designation_name_eng != ''
            ORDER BY designation_name_eng
        `);
        
        responseHandler(res, 200, 'Designations fetched successfully', result.rows);
    } catch (error) {
        responseHandler(res, 400, 'Error fetching designations', null, error);
    }
};


module.exports = { getDistrictData, getBlockData, getClusterData, getAllMedium,getAllDeoList,getAllCacList,
  getDivision, getClass,getDepotData,getDesignationDropdown
 };
