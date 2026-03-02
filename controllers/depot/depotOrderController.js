
const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");

const getDepotOrders = async (req, res) => {
    /* #swagger.tags = ['Depot Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    const user_id = req.user.user_id;
    try {
        const result = await pool.query(
            `SELECT * FROM tbc_depot_challans WHERE depot_id=$1`,
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
const getDepotOrdersById = async (req, res) => {
    /* #swagger.tags = ['Depot Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
        const { order_id } = req.params;
        const user_id = req.user.user_id;

        const result = await pool.query(
            `SELECT * FROM tbc_depot_challans WHERE depot_id=$1 and id=$2`,
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

const getChallanWithDetails = async (req, res) => {
    /* #swagger.tags = ['Depot Orders'] */
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
                p.name AS publisher_name,
                p.address as publisher_address, 
                p.contact_number as publisher_contact, 
                p.email as publisher_email, 
                d.name AS depot_name, 
                d.address as depot_address, 
                d.contact_number as depot_contact, 
                d.email as depot_email, 
                b.book_id, 
                b.sets, 
                b.books_per_set, 
                b.book_weight, 
                b.remaining_qty,
                sb.name,
                sb.medium, 
                sb.class_level,
                m.medium_name
            FROM tbc_depot_challans c
            JOIN mst_users p ON c.publisher_id = p.user_id
            JOIN mst_users d ON c.depot_id = d.user_id
            JOIN tbc_depot_challan_books b ON c.id = b.challan_id
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
            publisher_name: result.rows[0].publisher_name,
            publisher_address: result.rows[0].publisher_address,
            publisher_contact: result.rows[0].publisher_contact,
            publisher_email: result.rows[0].publisher_email,
            depot_name: result.rows[0].depot_name,
            depot_address: result.rows[0].depot_address,
            depot_contact: result.rows[0].depot_contact,
            depot_email: result.rows[0].depot_email,
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


module.exports = { getDepotOrders, getDepotOrdersById,getChallanWithDetails };