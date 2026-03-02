const { pool } = require('../../config/db');
const moment = require('moment');

const assignBooksToDEO = async (req, res) => {
    /* #swagger.tags = ['Depot to DEO Book Assignment'] */
    /* #swagger.security = [{ "Bearer": [] }] */
    try {
        const { deo_id, books, challan_date,depot_challan } = req.body; 
        // books = [{ book_id, sets, books_per_set, book_weight,open_books }]
        const depot_id = req.user.user_id;
        let total_weight = 0;
        await pool.query('BEGIN');

        const datePrefix = moment().format('YYYYMM');
        const countRes = await pool.query(`SELECT COUNT(*) FROM tbc_depot_deo_challans WHERE challan_number LIKE $1`, [`DEO-${datePrefix}%`]);
        const serial = String(Number(countRes.rows[0].count) + 1).padStart(3, '0');
        const challan_number = `DEO-${datePrefix}-${serial}`;

        const challanRes = await pool.query(
            `INSERT INTO tbc_depot_deo_challans (challan_number, challan_date, depot_id, deo_id, dispatch_status)
             VALUES ($1, $2, $3, $4, false) RETURNING id`,
            [challan_number, challan_date, depot_id, deo_id]
        );

        const challan_id = challanRes.rows[0].id;

        for (let book of books) {
            const { book_id, sets, books_per_set, book_weight,open_books } = book;
            const assigned_quantity = (sets * books_per_set) + open_books;
            const remaining_qty = (sets * books_per_set)+ open_books;
            const bundle_weight = books_per_set * book_weight;
            const total_book_weight = assigned_quantity * book_weight;

            const stockRes = await pool.query(
                `SELECT remaining_qty FROM tbc_depot_challan_books WHERE book_id=$1 AND challan_id=$2`,
                [book_id, depot_challan]
            );

            if (stockRes.rows.length === 0 || stockRes.rows[0].remaining_qty < assigned_quantity) {
                await pool.query('ROLLBACK');
                return res.status(400).json({
                    message: `Insufficient stock for Book ID ${book_id}`
                });
            }

            await pool.query(
                `INSERT INTO tbc_depot_deo_challan_books (challan_id, book_id, sets, books_per_set,open_books, book_weight, bundle_weight,remaining_qty)
                 VALUES ($1, $2, $3, $4, $5, $6,$7,$8)`,
                [challan_id, book_id, sets, books_per_set, open_books,book_weight, bundle_weight,remaining_qty]
            );

            await pool.query(
                `UPDATE tbc_depot_challan_books SET remaining_qty = remaining_qty - $1 WHERE book_id=$2 AND challan_id=$3`,
                [assigned_quantity, book_id, depot_challan]
            );

            total_weight += total_book_weight;
        }

        await pool.query(`UPDATE tbc_depot_deo_challans SET total_weight=$1 WHERE id=$2`, [total_weight, challan_id]);

        await pool.query(
            `INSERT INTO tbc_notifications (user_id, message)
             VALUES ($1, $2)`,
            [deo_id, `New challan assigned from Depot. Challan No: ${challan_number}`]
        );

        await pool.query('COMMIT');
        res.json({ message: 'Challan created and books assigned to DEO', challan_number });
    } catch (error) {
        await pool.query('ROLLBACK');
        res.status(500).json({ message: 'Error assigning books to DEO', error: error.message });
    }
};

const getDepotDeoChallans = async (req, res) => {
    /* #swagger.tags = ['Depot to DEO Book Assignment'] */
    /* #swagger.security = [{ "Bearer": [] }] */
    try {
        const depot_id = req.user.user_id;
        const result = await pool.query(`SELECT c.*, p.name as depot_name, d.name as deo_name ,m.district_name  FROM tbc_depot_deo_challans as c
            JOIN mst_users p ON c.depot_id = p.user_id
            JOIN mst_users d ON c.deo_id = d.user_id 
            JOIN mst_deo m on m.mobile::bigint = d.column_value::bigint
             WHERE c.depot_id = $1`, [depot_id]);
        res.json({ challans: result.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching challans', error: error.message });
    }
};


const getChallanWithDetails = async (req, res) => {
    /* #swagger.tags = ['Depot to DEO Book Assignment'] */
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
                d.name AS deo_name, 
                d.address as deo_address, 
                d.contact_number as deo_contact, 
                d.email as deo_email, 
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
            FROM tbc_depot_deo_challans c
            JOIN mst_users p ON c.depot_id = p.user_id
            JOIN mst_users d ON c.deo_id = d.user_id
            JOIN tbc_depot_deo_challan_books b ON c.id = b.challan_id
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
            deo_name: result.rows[0].deo_name,
            deo_address: result.rows[0].deo_address,
            deo_contact: result.rows[0].deo_contact,
            deo_email: result.rows[0].deo_email,
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


module.exports = {
    assignBooksToDEO,
    getDepotDeoChallans,
    getChallanWithDetails
};
