const xlsx = require("xlsx");
const format = require("pg-format");
const fs = require("fs");

const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");

// Add Subject
const getAllCount = async (req, res) => {
    /* #swagger.tags = ['Subjects'] */
    /* #swagger.security = [{'Bearer': []}] */
    try {
        const result = await pool.query(
            `WITH 
cluster_received_v AS (
	SELECT
		mu.user_id as cluster_id,
		SUM(tbs.total_dispatched) AS books_received
		FROM public.tbc_depot_cluster_challans dcc
	JOIN mst_users as mu on mu.column_value::TEXT=dcc.cluster_id::TEXT
	INNER JOIN tbc_depot_book_stock tbs on mu.user_id = tbs.user_id
	GROUP BY mu.user_id
),
cluster_received AS (
	SELECT
		mu.user_id as cluster_id,
		dcc.id,
		SUM(dccb.total_books) AS books_received
	FROM public.tbc_depot_cluster_challans dcc
	JOIN mst_users as mu on mu.column_value::TEXT=dcc.cluster_id::TEXT
	INNER JOIN public.tbc_depot_cluster_challan_books dccb ON dcc.id = dccb.challan_id
	where mu.role_id=6
	GROUP BY dcc.id,mu.user_id
),
cluster_distributed AS (
	SELECT
		sc.sender_id AS cluster_id,
		SUM(scb.quantity) AS books_distributed
	FROM public.tbc_school_challans sc
	INNER JOIN public.tbc_school_challan_books scb ON sc.id = scb.challan_id
	GROUP BY sc.sender_id
),
cluster_scanned AS (
	SELECT
		sc.sender_id AS cluster_id,
		COUNT(bt.id) AS books_scanned
	FROM public.tbc_book_tracking bt
	INNER JOIN public.tbc_school_challans sc ON bt.udise_code = sc.udise_code
	WHERE bt.scanned_yn = true
	GROUP BY sc.sender_id
)
SELECT
	COUNT(COALESCE(cs.cluster_id, 0)) as recieved,
	COUNT(COALESCE(crv.cluster_id, 0)) as recieved_verified,
	SUM(COALESCE(cr.books_received, 0)) AS total_books_received_to_cluster,
	SUM(COALESCE(crv.books_received, 0)) AS total_books_received_to_cluster_verified,
	SUM(COALESCE(cd.books_distributed, 0)) AS total_books_distributed_to_schools,
	SUM(COALESCE(cs.books_scanned, 0)) AS total_books_scanned_by_schools
FROM cluster_received cr
LEFT JOIN cluster_received_v as crv on crv.cluster_id = cr.cluster_id
LEFT JOIN cluster_distributed cd ON cr.cluster_id = cd.cluster_id
LEFT JOIN cluster_scanned cs ON cr.cluster_id = cs.cluster_id
`);
        responseHandler(res, 201, 'Total Cluster Count', result.rows[0]);
    } catch (error) {
        responseHandler(res, 400, 'Error getting report', null, error);
    }
};

// Get Subject by Class Level
const getClusterWiseCount = async (req, res) => {
    /* #swagger.tags = ['Subjects'] */
    /* #swagger.security = [{'Bearer': []}] */
   
    try {
        // Get pagination parameters from query string
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // First, get the total count of clusters
        const countQuery = `
            SELECT COUNT(DISTINCT mu.user_id) as total
            FROM public.tbc_depot_cluster_challans dcc 
            JOIN mst_users as mu on mu.column_value::TEXT=dcc.cluster_id::TEXT
            JOIN mst_cluster as mc on mu.column_value::TEXT=mc.cluster_cd::TEXT
            JOIN public.tbc_depot_cluster_challan_books dccb ON dcc.id = dccb.challan_id
            WHERE mu.role_id=6
        `;
        const countResult = await pool.query(countQuery);
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        // Then get the paginated data
        const dataQuery = `
            WITH all_clusters AS (
                SELECT DISTINCT mu.user_id as cluster_id 
                FROM public.tbc_depot_cluster_challans dcc 
                JOIN mst_users as mu on mu.column_value::TEXT=dcc.cluster_id::TEXT
            ),
            cluster_received AS (
                SELECT
                    mu.user_id as cluster_id,
                    dcc.id,
                    mc.cluster_name,
                    SUM(dccb.total_books) AS books_received
                FROM public.tbc_depot_cluster_challans dcc
                JOIN mst_users as mu on mu.column_value::TEXT=dcc.cluster_id::TEXT
                JOIN mst_cluster as mc on mu.column_value::TEXT=mc.cluster_cd::TEXT
                JOIN public.tbc_depot_cluster_challan_books dccb ON dcc.id = dccb.challan_id
                WHERE mu.role_id=6
                GROUP BY dcc.id, mu.user_id, mc.cluster_name
            ),
            cluster_distributed AS (
                SELECT
                    sc.sender_id AS cluster_id,
                    SUM(scb.quantity) AS books_distributed
                FROM public.tbc_school_challans sc
                JOIN public.tbc_school_challan_books scb ON sc.id = scb.challan_id
                GROUP BY sc.sender_id
            ),
            cluster_scanned AS (
                SELECT
                    sc.sender_id AS cluster_id,
                    COUNT(bt.id) AS books_scanned
                FROM public.tbc_book_tracking bt
                LEFT JOIN public.tbc_school_challans sc ON bt.udise_code = sc.udise_code
                WHERE bt.scanned_yn = true
                GROUP BY sc.sender_id
            )
            SELECT
                ac.cluster_id,
                COALESCE(cr.cluster_name, 'Unknown') as cluster_name,
                COALESCE(cr.books_received, 0) AS total_books_received_to_cluster,
                COALESCE(cd.books_distributed, 0) AS total_books_distributed_to_schools,
                COALESCE(cs.books_scanned, 0) AS total_books_scanned_by_schools
            FROM all_clusters ac
            LEFT JOIN cluster_received cr ON ac.cluster_id = cr.cluster_id
            LEFT JOIN cluster_distributed cd ON ac.cluster_id = cd.cluster_id
            LEFT JOIN cluster_scanned cs ON ac.cluster_id = cs.cluster_id
            WHERE cr.books_received IS NOT NULL
            ORDER BY cr.books_received DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await pool.query(dataQuery, [limit, offset]);

        if (result.rows.length === 0) {
            return responseHandler(res, 404, 'No clusters found');
        }

        const response = {
            success: true,
            message: 'Cluster records fetched successfully',
            count: null,
            data: {
                data: result.rows,
                pagination: {
                    total,
                    totalPages,
                    page,
                    limit
                }
            },
            error: null
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error('cluster wise report', error);
        return responseHandler(res, 500, 'Error On Fetching cluster wise data', null, error);
    }
};

// Update Subject
const updateSubject = async (req, res) => {
    /* #swagger.tags = ['Subjects'] */
    /* #swagger.security = [{'Bearer': []}] */
    try {
        const { id } = req.params;
        const subjectId = parseInt(id); // Ensure id is an integer
        const { name, class_level, district, book_type, medium } = req.body;

        const updatedSubject = await pool.query(
            "UPDATE mst_subjects SET name = $1, class_level = $2, district_id=$3, book_type=$4, medium=$5  WHERE id = $6 RETURNING *",
            [name, class_level, district, book_type,medium, subjectId]
        );

        if (updatedSubject.rows.length === 0) {
            return responseHandler(res, 404, 'Subject not found');
        }
        responseHandler(res, 200, 'Subject updated successfully', updatedSubject.rows[0]);
    } catch (error) {
        responseHandler(res, 400, 'Error updating subject', null, error);
    }
};

// Delete Subject
const deleteSubject = async (req, res) => {
    /* #swagger.tags = ['Subjects'] */
    /* #swagger.security = [{'Bearer': []}] */
    try {
        const { id } = req.params;
        const subjectId = parseInt(id); // Ensure id is an integer
        const deletedSubject = await pool.query("DELETE FROM mst_subjects WHERE id = $1 RETURNING *", [subjectId]);

        if (deletedSubject.rows.length === 0) {
            return responseHandler(res, 404, 'Subject not found');
        }
        responseHandler(res, 200, 'Subject deleted successfully', deletedSubject.rows[0]);
    } catch (error) {
        responseHandler(res, 400, 'Error deleting subject', null, error);
    }
};


module.exports = { getAllCount, getClusterWiseCount};