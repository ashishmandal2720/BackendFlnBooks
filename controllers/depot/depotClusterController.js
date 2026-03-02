const { pool } = require('../../config/db')

const assignBooksToCluster = async (req, res) => {
  /* #swagger.tags = ['Depot to Cluster'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const depot_id = req.user.user_id;
    const { cluster_id, books, challan_date,depot_challan } = req.body;

    let total_books = 0;
    let total_weight = 0;

    await pool.query('BEGIN');

    const challanRes = await pool.query(
      `INSERT INTO tbc_depot_cluster_challans (depot_id, cluster_id, challan_date)
       VALUES ($1, $2, $3) RETURNING *`,
      [depot_id, cluster_id, challan_date]
    );

    const challan_id = challanRes.rows[0].id;
    const challan_number = `CLUS-${challan_date.replace(/-/g, '')}-${challan_id}`;

    await pool.query(`UPDATE tbc_depot_cluster_challans SET challan_number = $1 WHERE id = $2`, [challan_number, challan_id]);

    for (let book of books) {
      const { book_id, sets, books_per_set, book_weight,open_books } = book;
      const total_book_count = (sets * books_per_set) + open_books;
      const remaining_qty = (sets * books_per_set)+ open_books;
      const bundle_weight = books_per_set * book_weight;
      const total_bundle_weight = sets * bundle_weight;

      const stockCheck = await pool.query(
        `SELECT remaining_qty FROM tbc_depot_challan_books WHERE challan_id=$1 AND book_id=$2`,
        [depot_challan, book_id]
      );

      if (!stockCheck.rows.length || stockCheck.rows[0].remaining_qty < total_book_count) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ message: `Insufficient stock for book ID ${book_id}` });
      }

      await pool.query(
        `INSERT INTO tbc_depot_cluster_challan_books (challan_id, book_id, sets, books_per_set,open_books, book_weight, bundle_weight,remaining_qty)
         VALUES ($1, $2, $3, $4, $5, $6,$7,$8)`,
        [challan_id, book_id, sets, books_per_set, open_books, book_weight, bundle_weight,remaining_qty]
      );

      await pool.query(
        `UPDATE tbc_depot_challan_books SET remaining_qty = remaining_qty - $1 WHERE challan_id=$2 AND book_id=$3`,
        [total_book_count, depot_challan, book_id]
      );

      total_books += total_book_count;
      total_weight += total_bundle_weight;
    }

    await pool.query(
      `UPDATE tbc_depot_cluster_challans SET total_books=$1, total_weight=$2 WHERE id=$3`,
      [total_books, total_weight, challan_id]
    );

    await pool.query(
      `INSERT INTO tbc_notifications (user_id, message)
       VALUES ($1, $2)`,
      [cluster_id, `Books assigned to you in challan ${challan_number}`]
    );

    await pool.query('COMMIT');
    res.json({ message: 'Books assigned to Cluster successfully', challan_number });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ message: 'Error assigning books to Cluster', error: error.message });
  }
};

const getDepotClusterChallans = async (req, res) => {
  /* #swagger.tags = ['Depot to Cluster'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const  depot_id  = req.user.user_id;
    const result = await pool.query(`SELECT c.*, p.name as depot_name, d.name as cac_name , m.cluster_name FROM tbc_depot_cluster_challans as c
      JOIN mst_users p ON c.depot_id = p.user_id
      JOIN mst_users d ON c.cluster_id = d.user_id 
      JOIN mst_cac m on m.cluster_cd::bigint = d.column_value::bigint
      WHERE c.depot_id = $1`, [depot_id]);
    res.json({ challans: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching challans', error: error.message });
  }
};

const getChallanWithDetails = async (req, res) => {
  /* #swagger.tags = ['Depot to Cluster'] */
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
              book_total:row.books_per_set * row.sets + row.open_books,
              book_remaining_qty: row.remaining_qty,
              book_total_weight:row.books_per_set * row.sets * row.book_weight + (row.open_books * row.book_weight),
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
  assignBooksToCluster,
  getDepotClusterChallans,
  getChallanWithDetails
};