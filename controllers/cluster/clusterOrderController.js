
const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");

const getClusterOrders = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    const { cluster_id } = req.query;
    console.log(cluster_id)
    if (!cluster_id) {
        return responseHandler(res, 400, 'Please provide cluster id', null);
    }
    const user_id = req.user.user_id;
    try {
        let result = await pool.query(
            `SELECT * FROM tbc_depot_cluster_challans WHERE cluster_id=$1::bigint`,
            [cluster_id]
        );


        if (result.rows.length === 0) {
            return responseHandler(res, 404, 'No orders found', []);
        }

        responseHandler(res, 200, 'Challan fetched', { result: result.rows });
    } catch (error) {
        console.error("Error fetching Challan:", error);
        responseHandler(res, 400, 'Error fetching Challan', null, error);
    }
};
// Get Single Publisher
const getClusterOrdersById = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
        const { challan_id, cluster_id } = req.query;
        const user_id = req.user.user_id;

        const result = await pool.query(
            `SELECT * FROM tbc_depot_cluster_challans WHERE cluster_id=$1 and id=$2`,
            [cluster_id, challan_id]
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
        const { cluster_id } = req.param;
        //   const cluster_id = req.user.user_id;
        const result = await pool.query(`SELECT c.*, p.name as depot_name, d.name as cluster_name ,m.cluster_name  FROM tbc_depot_cluster_challans as c
          JOIN mst_users p ON c.depot_id = p.user_id
          JOIN mst_users d ON c.cluster_id::bigint = d.column_value::bigint 
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
              b.id as b_id, 
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
          WHERE c.id = $1` ,
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
                bid:row.b_id,
                book_id: row.book_id,
                sets: row.sets,
                medium: row.medium,
                class_level: row.class_level,
                books_per_set: row.books_per_set,
                book_weight: row.book_weight,
                open_books: row.open_books,
                book_bundle_weight: row.book_weight * row.books_per_set,
                book_total: row.books_per_set * row.sets + row.open_books,
                book_remaining_qty: row.remaining_qty,
                book_total_weight: row.books_per_set * row.sets * row.book_weight + (row.open_books * row.book_weight),
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
        const { challan_id, cluster_id } = req.query;
        console.log(challan_id, cluster_id)
        const result = await pool.query(
            `SELECT 
c.id AS challan_id, 
c.challan_number, 
c.challan_date, 
c.total_weight,
c.verified, 
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
b.id as bid, 
b.sets, 
b.books_per_set, 
b.total_books,
b.book_weight, 
b.remark,
b.verified as b_verified,
b.remaining_qty,
b.received_qty,
sb.name,
sb.medium, 
sb.class_level,
m.medium_name
FROM tbc_depot_cluster_challans c
LEFT JOIN mst_users p ON c.depot_id = p.column_value::int AND p.role_id=3
JOIN mst_users d ON c.cluster_id = d.column_value::bigint AND d.column_value ~ '^[0-9]+$' AND d.role_id=6
JOIN tbc_depot_cluster_challan_books b ON c.id = b.challan_id
JOIN tbc_books bk ON b.book_id = bk.id
JOIN mst_subjects sb ON bk.subject_id = sb.id
JOIN mst_medium m ON sb.medium::int = m.medium_cd
            WHERE c.id = $1 and c.cluster_id = $2`,
            [challan_id, cluster_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Challan not found" });
        }
        console.log(result.rows[0].total_books);

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
            verified: result.rows[0].verified,
            books: result.rows.map(row => ({
                book_id: row.book_id,
                bid: row.bid,
                sets: row.sets,
                medium: row.medium,
                class_level: row.class_level,
                books_per_set: row.books_per_set,
                book_weight: row.book_weight,
                received_qty: row.received_qty,
                remark: row.remark,
                verified: row.b_verified,
                book_bundle_weight: row.book_weight * row.books_per_set,
                book_total: row.total_books,
                book_remaining_qty: row.remaining_qty,
                book_total_weight: row.books_per_set * row.sets * row.book_weight,
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
const getDistributionHistory = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
        const user_id = req.user.user_id;
        const { udise_code } = req.query;
        let result ;
        if(udise_code) {
          result = await pool.query(
            `SELECT tsc.* , ms.school_name FROM tbc_school_challans tsc  JOIN mst_schools ms on tsc.udise_code = ms.udise_sch_code  WHERE tsc.sender_id=$1::bigint AND tsc.udise_code::TEXT=$2::TEXT`,
            [user_id,udise_code]
        );
    }
    else {  
        result = await pool.query(
             `SELECT tsc.* , ms.school_name FROM tbc_school_challans tsc  JOIN mst_schools ms on tsc.udise_code = ms.udise_sch_code  WHERE tsc.sender_id=$1::bigint`,
            [user_id]
        );
    }


        if (result.rows.length === 0) {
            return responseHandler(res, 404, 'No orders found', []);
        }

        responseHandler(res, 200, 'Challan fetched', { result: result.rows });
    } catch (error) {
        console.error("Error fetching distribution history:", error);
        responseHandler(res, 500, 'Something went wrong', null, error.message);
    }
}

const getHistoryDetails = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
        const { challan_id, udise_code } = req.query;
        console.log(challan_id, udise_code)
        const result = await pool.query(
            `SELECT 
c.id AS challan_id, 
c.challan_number, 
c.challan_date, 
c.received_status as verified, 
c.dispatch_status, 
p.name AS cluster_name,
p.address as cluster_address, 
p.contact_number as cluster_contact, 
p.email as cluster_email, 
d.school_name AS school_name, 
d.lgd_village_name as school_address, 
d.sch_mobile as school_contact, 
d.email as school_email, 
b.book_id,
b.id as bid, 
b.quantity as total_books,
b.received_status as b_verified,
b.remaining_qty,
b.received_qty,
sb.name,
sb.medium, 
sb.class_level,
m.medium_name
FROM tbc_school_challans c
LEFT JOIN mst_users p ON c.sender_id = p.column_value::bigint AND p.role_id=6
JOIN mst_schools d ON c.udise_code::TEXT = d.udise_sch_code::TEXT
JOIN tbc_school_challan_books b ON c.id = b.challan_id
JOIN tbc_books bk ON b.book_id = bk.id 
JOIN mst_subjects sb ON bk.subject_id = sb.id
JOIN mst_medium m ON sb.medium::int = m.medium_cd
            WHERE c.id = $1 and c.udise_code::TEXT = $2 ORDER BY sb.class_level, sb.medium, sb.name`,
            [challan_id, udise_code]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Challan not found" });
        }
        console.log(result.rows[0].total_books);

        const challanData = {
            challan_id: result.rows[0].challan_id,
            challan_number: result.rows[0].challan_number,
            challan_date: result.rows[0].challan_date,
            dispatch_status: result.rows[0].dispatch_status,
            cluster_name: result.rows[0].cluster_name,
            cluster_address: result.rows[0].cluster_address,
            cluster_contact: result.rows[0].cluster_contact,
            cluster_email: result.rows[0].cluster_email,
            school_name: result.rows[0].school_name,
            school_address: result.rows[0].school_address,
            school_contact: result.rows[0].school_contact,
            school_email: result.rows[0].school_email,
            verified: result.rows[0].verified,
            books: result.rows.map(row => ({
                book_id: row.book_id,
                bid: row.bid,
                medium: row.medium,
                class_level: row.class_level,
                received_qty: row.received_qty,
                verified: row.b_verified,
                book_total: row.total_books,
                book_remaining_qty: row.remaining_qty,
                subject_name: row.name,
                class_name: row.class_level,
                medium_name: row.medium_name,
            }))
        };

        
        responseHandler(res, 200, 'Challan details fetched successfully', { result: challanData });
    } catch (error) {
        console.error("Error fetching history details:", error);
        
        res.status(500).json({ error: error.message });
    }
};

const getDepotStockSummary = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */

    const { cluster_id,udise_id } = req.query;
    const user_id = req.user.user_id;
    console.log(user_id);
    
    if (!cluster_id) {
        return responseHandler(res, 400, "cluster_id is required");
    }
     if (!udise_id) {
        return responseHandler(res, 400, "udise_id is required");
    }

    try {
        const query = `
            SELECT 
                bs.id,
                bs.book_id,
                bs.total_dispatched,
                bs.total_received,
                bs.remaining_qty,
                bs.last_updated_at,
                sb.name AS subject_name,
                sb.class_level,
                m.medium_name,
                COALESCE((
                SELECT SUM(tscb.quantity)
                FROM tbc_school_challan_books tscb 
                WHERE tscb.book_id = bs.book_id AND tscb.udise_code = $2
            ), 0) AS distributed_quantity
            FROM 
                tbc_depot_book_stock bs
            JOIN 
                tbc_books bk ON bs.book_id = bk.id
            JOIN 
                mst_subjects sb ON bk.subject_id = sb.id
            JOIN 
                mst_medium m ON sb.medium::int = m.medium_cd
            WHERE 
                bs.user_id = $1
            ORDER BY 
                sb.class_level, sb.medium, sb.name;
        `;

        const result = await pool.query(query, [user_id,udise_id]);

        if (result.rowCount === 0) {
            return responseHandler(res, 404, "No stock information found for this cluster.", { stock: [] });
        }

        responseHandler(res, 200, 'Stock details fetched successfully', { stock: result.rows });

    } catch (error) {
        console.error("Error fetching stock summary:", error);
        responseHandler(res, 500, 'Something went wrong', null, error.message);
    }
};

const updateDepotChallanSIngle = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */

    const { bid, received_qty, remark } = req.body;
    const user_id = req.user.user_id;

    // --- 1. Input Validation ---
    // Ensure 'bid' (the primary key for the challan book entry) is provided.
    if (!bid) {
        return responseHandler(res, 400, "Challan book ID (bid) is required");
    }
    // 'received_qty' can be 0, so we check for undefined or null.
    if (received_qty === undefined || received_qty === null) {
        return responseHandler(res, 400, "received_qty is required");
    }

    // --- 2. Database Transaction ---
    // Get a client from the connection pool to run multiple queries in a transaction.
    const client = await pool.connect();

    try {
        // Start the transaction.
        await client.query('BEGIN');

        // --- 3. Update Challan Book ---
        // Set the received quantity and mark the challan as verified.
        // We use `RETURNING *` to get the updated row, including the book_id and total_books.
        // The condition `AND verified = false` prevents the same challan from being processed twice.
        const updateChallanResult = await client.query(
            `UPDATE tbc_depot_cluster_challan_books
             SET received_qty = $1, remark = $2, verified = true
             WHERE id = $3 AND verified = false
             RETURNING *`,
            [received_qty, remark, bid]
        );

        // If no row was updated, it means the challan was not found or was already verified.
        if (updateChallanResult.rowCount === 0) {
            await client.query('ROLLBACK'); // Abort the transaction.
            return responseHandler(res, 404, "Challan book not found or has already been verified.");
        }

        const verifiedChallan = updateChallanResult.rows[0];
        const { book_id, total_books } = verifiedChallan;

        // --- 4. Update Stock Summary Table ---
        // This is an "UPSERT" operation.
        // - If a row for the book_id exists in tbc_depot_book_stock, it updates the totals.
        // - If not, it inserts a new row.
        const stockUpdateQuery = `
            INSERT INTO tbc_depot_book_stock (user_id,book_id, total_dispatched,remaining_qty, total_received, last_updated_at)
            VALUES ($1,$2, $3,$4, $4, NOW())
            ON CONFLICT (book_id, user_id)
            DO UPDATE SET
                total_dispatched = tbc_depot_book_stock.total_dispatched + EXCLUDED.total_dispatched,
                remaining_qty = tbc_depot_book_stock.remaining_qty + EXCLUDED.remaining_qty,
                total_received = tbc_depot_book_stock.total_received + EXCLUDED.total_received,
                last_updated_at = NOW();
        `;
        
        // The `total_books` from this challan is added to `total_dispatched`.
        // The `received_qty` from this challan is added to `total_received`.
        await client.query(stockUpdateQuery, [user_id,book_id, total_books, received_qty]);

        // --- 5. Commit Transaction ---
        // If all queries were successful, commit the changes to the database.
        await client.query('COMMIT');

        responseHandler(res, 200, 'Challan verified and stock updated successfully', {
            challan_book: verifiedChallan
        });

    } catch (error) {
        // --- 6. Error Handling ---
        // If any error occurred, roll back all changes made during the transaction.
        await client.query('ROLLBACK');
        console.error("Error verifying challan:", error);
        responseHandler(res, 500, 'Something went wrong', null, error);
    } finally {
        // --- 7. Release Client ---
        // Always release the client back to the pool, whether the transaction succeeded or failed.
        client.release();
    }
};

const unverifyDepotChallanSingle = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    
    const { bid } = req.body;
    const user_id = req.user.user_id;

    if (!bid) {
        return responseHandler(res, 400, "Challan book ID (bid) is required");
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Fetch challan data
        const challanResult = await client.query(
            `SELECT * FROM tbc_depot_cluster_challan_books WHERE id = $1 AND verified = true`,
            [bid]
        );

        if (challanResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return responseHandler(res, 404, "Challan not found or is not verified");
        }

        const challan = challanResult.rows[0];
        const { book_id, received_qty, total_books } = challan;

        // 2. Fetch stock entry
        const stockResult = await client.query(
            `SELECT * FROM tbc_depot_book_stock WHERE user_id = $1 AND book_id = $2`,
            [user_id, book_id]
        );

        if (stockResult.rowCount === 0) {
            // No stock entry — proceed with unverification only
            await client.query(
                `UPDATE tbc_depot_cluster_challan_books
                 SET verified = false, remark = NULL, received_qty = NULL
                 WHERE id = $1`,
                [bid]
            );

            await client.query('COMMIT');
            return responseHandler(res, 200, "Challan unverified (no stock entry existed)");
        }

        const stock = stockResult.rows[0];

        const isExactMatch = 
            Number(stock.total_received) === Number(received_qty) &&
            Number(stock.total_dispatched) === Number(total_books);

        if (isExactMatch) {
            // 3a. Delete stock entry
            await client.query(
                `DELETE FROM tbc_depot_book_stock WHERE user_id = $1 AND book_id = $2`,
                [user_id, book_id]
            );
        } else {
            // 3b. Subtract values from stock
            await client.query(
                `UPDATE tbc_depot_book_stock
                 SET 
                    total_dispatched = total_dispatched - $1,
                    total_received = total_received - $2,
                    remaining_qty = remaining_qty - $2,
                    last_updated_at = NOW()
                 WHERE user_id = $3 AND book_id = $4`,
                [total_books, received_qty, user_id, book_id]
            );
        }

        // 4. Unverify challan
        await client.query(
            `UPDATE tbc_depot_cluster_challan_books
             SET verified = false, remark = NULL, received_qty = NULL
             WHERE id = $1`,
            [bid]
        );

        await client.query('COMMIT');
        responseHandler(res, 200, "Challan unverified and stock updated");

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error unverifying challan:", error);
        responseHandler(res, 500, 'Something went wrong', null, error);
    } finally {
        client.release();
    }
};

const updateDepotChallanStatus = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */
    await pool.query('BEGIN');
    try {
        const { challan_id, remarks ="", books, received_quantity } = req.body;
        const challanId = parseInt(challan_id); // Ensure challan_id is an integer
        // console.log(challanId)
        const receivedQuantity = parseInt(received_quantity); // Ensure received_quantity is an integer
        if (!challanId) {
            return res.status(400).json({ message: "challan Id is required" });
        }

        if (isNaN(parseInt(received_quantity))) {
            return res.status(400).json({
                message: "received_qty must be a valid number",
            });
        }

        for (let book of books) {
            const { bid, received_qty, remark="" } = book;
            if (parseInt(bid) === 0) {
                await pool.query('ROLLBACK');
                return res.status(400).json({
                    message: "bid and received_qty must be valid numbers",
                });
            }

            await pool.query(
                `UPDATE tbc_depot_cluster_challan_books 
                SET remark = COALESCE($2, remark),
             received_qty = COALESCE($1, received_qty), verified=true WHERE id=$3`,
                [received_qty, remark, bid]
            );
        }
        const result = await pool.query(
            `UPDATE tbc_depot_cluster_challans
           SET 
             remarks = COALESCE($1, remarks),
             received_qty = COALESCE($2, received_qty),
             verified = true
           WHERE id = $3
           RETURNING *`,
            [remarks, parseInt(receivedQuantity), challanId]
        );
        console.log(result.rows);
        if (result.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: "Challan not found" });
        }
        await pool.query('COMMIT');
        res.json({
            message: "Challan status updated successfully",
            challan: result.rows[0],
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error("Error updating challan:", error);
        res
            .status(500)
            .json({ message: "Something went wrong", error: error.message });
    }
};


const getClusterReport = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */

    const { cluster_id } = req.params;
    const user_id = req.user.user_id;

    if (!cluster_id) {
        return responseHandler(res, 200, "cluster_id is required");
    }

    try {
        // 1. Book stock summary
        const stockQuery = `
            SELECT 
                COALESCE(SUM(bs.total_received), 0) AS total_received,
                COALESCE(SUM(bs.total_received - bs.remaining_qty), 0) AS total_distributed
            FROM 
                tbc_depot_book_stock bs
            WHERE 
                bs.user_id = $1;
        `;
        const stockResult = await pool.query(stockQuery, [user_id]);

        // 2. Student & school summary from cluster_student_count
        const clusterQuery = `
            SELECT 
                COALESCE(SUM(class_1 + class_2 + class_3 + class_4 + class_5 + class_6 + class_7 + class_8), 0) AS total_students,
                COUNT(DISTINCT udise_sch_code) AS total_schools
            FROM 
                cluster_student_count
            WHERE 
                cluster_cd = $1;
        `;
        const clusterResult = await pool.query(clusterQuery, [cluster_id]);

        responseHandler(res, 200, 'Depot and student summary fetched successfully', {
            total_received: parseInt(stockResult.rows[0].total_received),
            total_distributed: parseInt(stockResult.rows[0].total_distributed),
            total_students: parseInt(clusterResult.rows[0].total_students),
            total_schools: parseInt(clusterResult.rows[0].total_schools),
        });

    } catch (error) {
        console.error("Error fetching depot and student summary:", error);
        responseHandler(res, 500, 'Something went wrong', null, error.message);
    }
};

const deleteFullChallanWithHistory = async (req, res) => {
    /* #swagger.tags = ['To School'] */
    /* #swagger.security = [{ "Bearer": [] }] */

    const client = await pool.connect();
    try {
        const sender_id = req.user.user_id;
        const sender_role = req.user.role;

        if (sender_role !== 6) {
            return res.status(403).json({ message: "Forbidden: Only clusters can perform this action." });
        }

        const { challan_id, reason } = req.body;

        if (!challan_id) {
            return res.status(400).json({ message: "Challan ID is required." });
        }

        await client.query('BEGIN');

        // --- 1. Validate challan ownership ---
        const challanRes = await client.query(
            `SELECT * FROM tbc_school_challans 
             WHERE id = $1 AND sender_id = $2 FOR UPDATE`,
            [challan_id, sender_id]
        );

        if (!challanRes.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Challan not found or not owned by this user." });
        }

        const udise_code = challanRes.rows[0].udise_code;

        // --- 2. Fetch all book entries ---
        const booksRes = await client.query(
            `SELECT * FROM tbc_school_challan_books 
             WHERE challan_id = $1 FOR UPDATE`,
            [challan_id]
        );

        const books = booksRes.rows;

        // --- 3. Loop through books to restore stock and insert into history ---
        for (const book of books) {
            const { book_id, quantity } = book;

            // Restore stock to cluster
            await client.query(
                `UPDATE tbc_depot_book_stock 
                 SET remaining_qty = remaining_qty + $1 
                 WHERE user_id = $2 AND book_id = $3`,
                [quantity, sender_id, book_id]
            );

            // Insert into history
            await client.query(
                `INSERT INTO tbh_school_challan_book_history 
                 (challan_id, udise_code, book_id, quantity, deleted_by, reason)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [challan_id, udise_code, book_id, quantity, sender_id, reason || 'Full challan deletion']
            );
        }

        // --- 4. Delete books and challan ---
        await client.query(
            `DELETE FROM tbc_school_challan_books WHERE challan_id = $1`,
            [challan_id]
        );

        await client.query(
            `DELETE FROM tbc_school_challans WHERE id = $1`,
            [challan_id]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: 'Challan and associated books deleted with history saved.' });

    } catch (err) {
        console.error("Error in deleteFullChallanWithHistory:", err);
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Error deleting challan', error: err.message });
    } finally {
        client.release();
    }
};


const clusterReportSchoolWise = async (req, res) => {
    /* #swagger.tags = ['School Challan'] */
    /* #swagger.security = [{"Bearer": []}] */

    const { udise_code } = req.body;
    const sender_id = req.user.user_id;


    if (!sender_id) {
        return responseHandler(res, 200, "sender_id is required");
    }

    try {
        const query = `
            SELECT 
                c.udise_code,
                MAX(cs.school_name) AS school_name,
                SUM(b.distributed_qty) AS total_distributed_qty,
                SUM(b.received_qty) AS total_received_qty,
                COALESCE(SUM(cs.class_1 + cs.class_2 + cs.class_3 + cs.class_4 + cs.class_5 + cs.class_6 + cs.class_7 + cs.class_8), 0) AS total_students,
                COUNT(DISTINCT cs.udise_sch_code) AS total_schools
            FROM 
                tbc_school_challans c
            JOIN 
                tbc_school_challan_books b ON c.id = b.challan_id
            LEFT JOIN 
                cluster_student_count cs ON cs.udise_sch_code = c.udise_code
            WHERE 
                c.sender_id = $1
                ${udise_code ? 'AND c.udise_code = $2' : ''}
            GROUP BY 
                c.udise_code
            ORDER BY 
                school_name;
        `;

        const values = udise_code ? [sender_id, udise_code] : [sender_id];
        const result = await pool.query(query, values);

        responseHandler(res, 200, 'Challan distribution and student summary fetched successfully', result.rows
        );

    } catch (error) {
        console.error("Error fetching challan distribution summary:", error);
        responseHandler(res, 500, 'Something went wrong', null, error.message);
    }
};
const updateBookDistribution = async (req, res) => {
    /* #swagger.tags = ['To School'] */
    /* #swagger.security = [{ "Bearer": [] }] */

    const client = await pool.connect();
    try {
        const sender_id = req.user.user_id;
        const sender_role = req.user.role;

        if (sender_role !== 6) {
            return res.status(403).json({ message: "Forbidden: Only clusters can perform this action." });
        }

        const { challan_id, books } = req.body;

        if (!challan_id || !books || !Array.isArray(books) || books.length === 0) {
            return res.status(400).json({ message: "Invalid input. 'challan_id' and a non-empty 'books' array are required." });
        }

        await client.query('BEGIN');

        // --- 1. Verify challan ownership ---
        const challanRes = await client.query(
            `SELECT * FROM tbc_school_challans WHERE id = $1 AND sender_id = $2 FOR UPDATE`,
            [challan_id, sender_id]
        );

        if (!challanRes.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Challan not found or not owned by this user." });
        }

        const udise_code = challanRes.rows[0].udise_code;

        // --- 2. Process each book update ---
        for (const book of books) {
            const { book_id, quantity } = book;

            if (!quantity || quantity < 0) continue;

            const existingBookRes = await client.query(
                `SELECT * FROM tbc_school_challan_books WHERE challan_id = $1 AND book_id = $2 FOR UPDATE`,
                [challan_id, book_id]
            );

            const stockRes = await client.query(
                `SELECT remaining_qty FROM tbc_depot_book_stock WHERE user_id = $1 AND book_id = $2 FOR UPDATE`,
                [sender_id, book_id]
            );

            const availableStock = stockRes.rows[0]?.remaining_qty || 0;

            if (existingBookRes.rows.length) {
                const prevQty = existingBookRes.rows[0].quantity;
                const diff = quantity - prevQty;

                if (diff > availableStock) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        message: `Insufficient stock for book ID ${book_id}. Available: ${availableStock}, Needed: ${diff}`
                    });
                }

                await client.query(
                    `UPDATE tbc_school_challan_books SET quantity = $1, remaining_qty = $1 WHERE challan_id = $2 AND book_id = $3`,
                    [quantity, challan_id, book_id]
                );

                await client.query(
                    `UPDATE tbc_depot_book_stock SET remaining_qty = remaining_qty - $1 WHERE user_id = $2 AND book_id = $3`,
                    [diff, sender_id, book_id]
                );
            } else {
                // New book addition
                if (quantity > availableStock) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        message: `Insufficient stock for book ID ${book_id}. Available: ${availableStock}, Required: ${quantity}`
                    });
                }

                await client.query(
                    `INSERT INTO tbc_school_challan_books (challan_id, udise_code, book_id, quantity, remaining_qty)
                     VALUES ($1, $2, $3, $4, $4)`,
                    [challan_id, udise_code, book_id, quantity]
                );

                await client.query(
                    `UPDATE tbc_depot_book_stock SET remaining_qty = remaining_qty - $1 WHERE user_id = $2 AND book_id = $3`,
                    [quantity, sender_id, book_id]
                );
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Challan updated successfully.' });

    } catch (err) {
        console.error("Error in updateBookDistribution:", err);
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Error updating challan', error: err.message });
    } finally {
        client.release();
    }
};
const createClusterChallanEntry = async (req, res) => {
    /* #swagger.tags = ['Cluster Orders'] */
    /* #swagger.security = [{"Bearer": []}] */

    const { depot_id, challan_date, challan_number, books } = req.body;
    const cluster_id = req.user.user_id;

    if (!depot_id || !challan_date || !books || !Array.isArray(books) || books.length === 0) {
        return responseHandler(res, 400, 'Invalid input data', null);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const challanRes = await client.query(
            `INSERT INTO tbc_depot_cluster_challans (depot_id, cluster_id, challan_date, challan_number)
             VALUES ($1,$2,$3,$4) RETURNING id`,
            [depot_id, cluster_id, challan_date, challan_number]
        );

        const challan_id = challanRes.rows[0].id;

        let total_books = 0;
        let total_weight = 0;

        for (const book of books) {
            const { book_id, sets = 0, books_per_set = 0, open_books = 0, book_weight = 0 } = book;

            const total_book_count = open_books;

            await client.query(
                `INSERT INTO tbc_depot_cluster_challan_books
                 (challan_id, book_id, sets, books_per_set, open_books, book_weight, bundle_weight, total_books, remaining_qty)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
                [challan_id, book_id, sets, books_per_set, open_books, 0, 0, total_book_count]
            );

            total_books += total_book_count;

            const subjectRes = await client.query(
                `SELECT ms.name, ms.medium, ms.class_level,ms.book_id
                 FROM tbc_books tb
                 JOIN mst_subjects ms ON tb.subject_id = ms.id
                 WHERE tb.id = $1`,
                [book_id]
            );
            const sub = subjectRes.rows[0] || {};
            const clusterRes = await client.query('SELECT name FROM mst_users WHERE user_id = $1', [cluster_id]);
            const depotRes = await client.query('SELECT name FROM mst_users WHERE user_id = $1', [depot_id]);

            await client.query(
                `INSERT INTO cluster_challan_info
                 (tchalanno, book_id, book_name_eng, medium_id, class_id, books,
                  cluster_name, clucd, school, school_id, Depot_ID, DepotName_Eng, trans_type_index)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,1)`,
                [
                    challan_number,
                    sub.book_id || book_id,
                    sub.name || null,
                    sub.medium || null,
                    sub.class_level || null,
                    total_book_count,
                    clusterRes.rows[0]?.name || null,
                    cluster_id,
                    null,
                    cluster_id,
                    depot_id,
                    depotRes.rows[0]?.name || null
                ]
            );
        }

        await client.query(
            `UPDATE tbc_depot_cluster_challans
             SET total_books=$1, total_weight=$2
             WHERE id=$3`,
            [total_books, total_weight, challan_id]
        );

        await client.query('COMMIT');
        responseHandler(res, 200, 'Challan entry created', { challan_id, challan_number });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating challan entry:', error);
        responseHandler(res, 500, 'Something went wrong', null, error.message);
    } finally {
        client.release();
    }
};


module.exports = { 
    getClusterOrders, 
    getClusterOrdersById, 
    getChallanWithDetails, 
    updateDepotChallanStatus, 
    getBookClusterDistribution,
    updateDepotChallanSIngle, 
    getDepotStockSummary,
    getBookDistributionDetails,
    getClusterReport,
    clusterReportSchoolWise,
    getDistributionHistory,
    getHistoryDetails,
    deleteFullChallanWithHistory,
    updateBookDistribution,unverifyDepotChallanSingle,
    createClusterChallanEntry
};