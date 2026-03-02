
const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");

const getClusterOrders = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    const user_id = req.user.user_id;
    try {
        const result = await pool.query(
            `SELECT * FROM tbc_depot_cluster_challans WHERE cluster_id=$1`,
            [user_id]
        );
        if (result.rows.length === 0) {
            return responseHandler(res, 404, 'No orders found', []);
        }

        responseHandler(res, 200, 'Challan fetched', { result: result.rows });
    } catch (error) {
        responseHandler(res, 400, 'Error fetching Challan', null, error);
    }
};

// Get Single Publisher
const getClusterOrdersById = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
        const { order_id } = req.params;
        const user_id = req.user.user_id;

        const result = await pool.query(
            `SELECT * FROM tbc_depot_cluster_challans WHERE cluster_id=$1 and id=$2`,
            [user_id, order_id]
        );

        if (result.rows.length === 0) {
            return responseHandler(res, 404, 'No orders found', []);
        }

      
        responseHandler(res, 200, 'Orders fetched', result.rows);
    } catch (error) {
        responseHandler(res, 400, 'Error fetching Order', null, error);
    }
};
const getBookClusterDistribution = async (req, res) => {
  /* #swagger.tags = ['Cluster Orders'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  console.log("getBookClusterDistribution");
  try {
      const cluster_id = req.user.user_id;
      const result = await pool.query(`SELECT c.*, p.name as depot_name, d.name as cluster_name ,m.cluster_name  FROM tbc_depot_cluster_challans as c
          JOIN mst_users p ON c.depot_id = p.user_id
          JOIN mst_users d ON c.cluster_id = d.user_id 
          JOIN mst_cac m on m.cluster_cd::bigint = d.column_value::bigint
           WHERE c.cluster_id = $1`, [cluster_id]);
      res.json({ challans: result.rows });
  } catch (error) {
      res.status(500).json({ message: 'Error fetching challans', error: error.message });
  }
};

const getBookDistributionDetails = async (req, res) => {
  /* #swagger.tags = ['Cluster Orders'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
      const { challan_id } = req.params;

      const result = await pool.query(
          `SELECT 
              c.id AS challan_id, 
              c.challan_number, 
              c.challan_date, 
              c.total_weight, 
              c.dispatch_status, 
              p.name as sender_name,
              p.address as sender_address, 
              p.contact_number as sender_contact, 
              p.email as sender_email,
              p.role_id as sender_role_id,
              d.name AS school_name, 
              d.address as school_address, 
              d.contact_number as school_contact, 
              d.email as school_email, 
              b.book_id, 
              b.sets, 
              b.books_per_set, 
              b.book_weight, 
              b.remaining_qty,
              b.open_books,
              sb.name,
              sb.medium, 
              sb.class_level,
              m.medium_name
          FROM tbc_depot_cluster_challans c
          JOIN mst_users p ON c.depot_id = p.user_id
          JOIN mst_users d ON c.cluster_id = d.user_id
          JOIN tbc_depot_cluster_challan_books b ON c.id = b.challan_id
          JOIN tbc_books bk ON b.book_id = bk.id
          JOIN mst_subjects sb ON bk.subject_id = sb.id
          JOIN mst_medium m ON sb.medium::int = m.medium_cd
          WHERE c.id = $1`,
          [challan_id]
      );

      if (result.rows.length === 0) {
          return res.status(404).json({ message: "Challan not found" });
      }

      const challanData = {
          challan_id: result.rows[0].challan_id,
          challan_number: result.rows[0].challan_number,
          challan_date: result.rows[0].challan_date,
          total_weight: result.rows[0].total_weight,
          dispatch_status: result.rows[0].dispatch_status,
          depot_name: result.rows[0].depot_name,
          depot_address: result.rows[0].depot_address,
          depot_contact: result.rows[0].depot_contact,
          depot_email: result.rows[0].depot_email,
          cluster_name: result.rows[0].cluster_name,
          cluster_address: result.rows[0].cluster_address,
          cluster_contact: result.rows[0].cluster_contact,
          cluster_email: result.rows[0].cluster_email,
          books: result.rows.map(row => ({
              book_id: row.book_id,
              sets: row.sets,
              medium:row.medium,
              class_level:row.class_level,
              books_per_set: row.books_per_set,
              book_weight: row.book_weight,
              open_books: row.open_books,
              book_bundle_weight:row.book_weight*row.books_per_set,
              book_total:row.books_per_set*row.sets+row.open_books,
              book_remaining_qty: row.remaining_qty,
              book_total_weight:row.books_per_set*row.sets*row.book_weight+(row.open_books *row.book_weight),
              subject_name: row.name,
              class_name: row.class_level,
              medium_name: row.medium_name,
          }))
      };

      res.json({ message: "Challan details fetched successfully", challan: challanData });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};
const getChallanWithDetails = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
        const { challan_id } = req.params;

        const result = await pool.query(
            `SELECT 
                c.id AS challan_id, 
                c.challan_number, 
                c.challan_date, 
                c.total_weight, 
                c.dispatch_status, 
                p.name AS depot_name,
                p.address as depot_address, 
                p.contact_number as depot_contact, 
                p.email as depot_email, 
                d.name AS cluster_name, 
                d.address as cluster_address, 
                d.contact_number as cluster_contact, 
                d.email as cluster_email, 
                b.book_id, 
                b.sets, 
                b.books_per_set, 
                b.book_weight, 
                b.remaining_qty,
                sb.name,
                sb.medium, 
                sb.class_level,
                m.medium_name
            FROM tbc_depot_cluster_challans c
            JOIN mst_users p ON c.depot_id = p.user_id
            JOIN mst_users d ON c.cluster_id = d.user_id
            JOIN tbc_depot_cluster_challan_books b ON c.id = b.challan_id
            JOIN tbc_books bk ON b.book_id = bk.id
            JOIN mst_subjects sb ON bk.subject_id = sb.id
            JOIN mst_medium m ON sb.medium::int = m.medium_cd
            WHERE c.id = $1`,
            [challan_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Challan not found" });
        }

        const challanData = {
            challan_id: result.rows[0].challan_id,
            challan_number: result.rows[0].challan_number,
            challan_date: result.rows[0].challan_date,
            total_weight: result.rows[0].total_weight,
            dispatch_status: result.rows[0].dispatch_status,
            depot_name: result.rows[0].depot_name,
            depot_address: result.rows[0].depot_address,
            depot_contact: result.rows[0].depot_contact,
            depot_email: result.rows[0].depot_email,
            cluster_name: result.rows[0].cluster_name,
            cluster_address: result.rows[0].cluster_address,
            cluster_contact: result.rows[0].cluster_contact,
            cluster_email: result.rows[0].cluster_email,
            books: result.rows.map(row => ({
                book_id: row.book_id,
                sets: row.sets,
                medium:row.medium,
                class_level:row.class_level,
                books_per_set: row.books_per_set,
                book_weight: row.book_weight,
                book_bundle_weight:row.book_weight*row.books_per_set,
                book_total:row.books_per_set*row.sets,
                book_remaining_qty: row.remaining_qty,
                book_total_weight:row.books_per_set*row.sets*row.book_weight,
                subject_name: row.name,
                class_name: row.class_level,
                medium_name: row.medium_name,
            }))
        };

        res.json({ message: "Challan details fetched successfully", challan: challanData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateDepotChallanStatus = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
      const { challan_id, remarks, received_quantity } = req.body;
      const challanId = parseInt(challan_id); // Ensure challan_id is an integer
      const receivedQuantity = parseInt(received_quantity); // Ensure received_quantity is an integer
      if (!challanId) {
        return res.status(400).json({ message: "challan Id is required" });
      }
    
  
      
     
      if (isNaN(Number(received_quantity))) {
        return res.status(400).json({
          message: "received_qty must be a valid number",
        });
      }
  
      const result = await pool.query(
        `UPDATE tbc_depot_cluster_challans
           SET 
             remarks = COALESCE($1, remarks),
             received_qty = COALESCE($2, received_qty),
             verified = true
           WHERE id = $3
           RETURNING id, remarks, received_qty, verified`,
        [remarks, Number(receivedQuantity), challanId]
      );
  
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Challan not found" });
      }
  
      res.json({
        message: "Challan status updated successfully",
        challan: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating challan:", error);
      res
        .status(500)
        .json({ message: "Something went wrong", error: error.message });
    }
  };

module.exports = { getClusterOrders, getClusterOrdersById,getChallanWithDetails,updateDepotChallanStatus,getBookClusterDistribution,getBookDistributionDetails };