const { pool } = require("../../config/db");
const responseHandler = require("../../utils/responseHandler");


const addBookDistribution = async (req, res) => {
    /* #swagger.tags = ['To School'] */
  /* #swagger.security = [{ "Bearer": [] }] */
    const client = await pool.connect();
    try {
      const sender_id = req.user.user_id;
      const sender_role = req.user.role; // 1 = Admin, 3 = Depot, 6 = Cluster, 4 = School
      console.log("Sender Role:", sender_role);

      const { udise_code, books, challan_date } = req.body;


      console.log("Books:", parseInt(udise_code), books, challan_date);
      //books =[{ book_id: 1, quantity: 10, stock_challan_id: 1 }]
  
      await client.query('BEGIN');
  
      const challanRes = await client.query(
        `INSERT INTO tbc_school_challans (sender_id, udise_code, challan_date)
         VALUES ($1, $2, $3) RETURNING *`,
        [sender_id, parseInt(udise_code), challan_date]
      );
  
      const challan_id = challanRes.rows[0].id;
      const challan_number = `SCH-${challan_date.replace(/-/g, '')}-${challan_id}`;
  
      await client.query(
        `UPDATE tbc_school_challans SET challan_number = $1 WHERE id = $2`,
        [challan_number, challan_id]
      );
  
      for (let book of books) {
        const { book_id, quantity, stock_challan_id } = book;
  
        let stockTable =
          sender_role === 6 // Cluster
            ? 'tbc_depot_cluster_challan_books'
            : 'tbc_depot_challan_books';
  
        const stockCheck = await client.query(
          `SELECT remaining_qty FROM ${stockTable} WHERE challan_id = $1 AND book_id = $2`,
          [stock_challan_id, book_id]
        );
  
        if (!stockCheck.rows.length || stockCheck.rows[0].remaining_qty < quantity) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `Insufficient stock for book ID ${book_id}` });
        }
  
        await client.query(
          `INSERT INTO tbc_school_challan_books (challan_id,udise_code, book_id, quantity, remaining_qty)
           VALUES ($1, $2, $3, $4, $5)`,
          [challan_id,parseInt(udise_code), book_id, quantity, quantity]
        );
  
        await client.query(
          `UPDATE ${stockTable} SET remaining_qty = remaining_qty - $1
           WHERE challan_id = $2 AND book_id = $3`,
          [quantity, stock_challan_id, book_id]
        );
      }
  
      // await client.query(
      //   `INSERT INTO tbc_notifications (user_id, message)
      //    VALUES ($1, $2)`,
      //   [udise_code, `Books assigned to your school in challan ${challan_number}`]
      // );
  
      await client.query('COMMIT');
      res.json({ message: 'Books assigned to school successfully', challan_number });
  
    } catch (err) {
      console.error(err);
      await client.query('ROLLBACK');
      res.status(500).json({ message: 'Error assigning books to school', error: err.message });
    } finally {
      client.release();
    }
  };
  


const getBookDistribution = async (req, res) => {
  /* #swagger.tags = ['To School'] */
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


const getBookDistributionDetails = async (req, res) => {
  /* #swagger.tags = ['To School'] */
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
          FROM sch_book_distribution c
          JOIN mst_users p ON c.sender_id = p.user_id
          JOIN mst_users d ON c.deo_id = d.user_id
          JOIN sch_assigned_books b ON c.id = b.order_id
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
const confirmSchoolBookReceipt = async (req, res) => {
    /* #swagger.tags = ['To School'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
     const teacher_id = req.user.user_id;
    const { books,udise_code} = req.body;

    console.log(teacher_id);
    

    const challanCheck = await pool.query(
      `SELECT * FROM tbc_school_challans WHERE udise_code = $1`,
      [udise_code]
    );
    if (!challanCheck.rows.length) {
      return res.status(404).json({ message: "Invalid challan or not assigned to this school" });
    }

    for (let book of books) {
      const { book_id, received_qty } = book;

      await pool.query(
        `UPDATE tbc_school_challan_books 
         SET received_qty = $1, received_status = TRUE
         WHERE id = $2`,
        [received_qty, book_id]
      );
    }

    await pool.query(
      `UPDATE tbc_school_challans 
       SET received_status = TRUE, received_at = CURRENT_TIMESTAMP,received_by = $2
       WHERE udise_code = $1`,
      [udise_code,teacher_id]
    );

    res.json({ message: "Books marked as received successfully." });
  } catch (err) {
    res.status(500).json({ message: "Error confirming book receipt", error: err.message });
  }
};
const updateSchoolBookDistribution = async (req, res) => {
  /* #swagger.tags = ['To School'] */
  /* #swagger.security = [{ "Bearer": [] }] */

  try {
    const user_id = req.user.user_id;
    const { book_id: bookIds, distributed_qty, udise_code } = req.body;

    // Check challan validity
    const challanCheck = await pool.query(
      `SELECT * FROM tbc_school_challans WHERE udise_code = $1`,
      [udise_code]
    );

    if (!challanCheck.rows.length) {
      return res.status(404).json({ message: "Invalid challan or not assigned to this school" });
    }

    // Fetch books with remaining_qty
    const booksRes = await pool.query(
      `SELECT id, book_id, remaining_qty, distributed_qty
       FROM tbc_school_challan_books
       WHERE udise_code = $1 AND id = ANY($2::int[])`,
      [udise_code, bookIds]
    );

    if (booksRes.rows.length === 0) {
      return res.status(404).json({ message: "No books found in challan for provided IDs" });
    }

    const books = booksRes.rows;

    // Sum total remaining
    const totalRemaining = books.reduce((acc, row) => acc + parseInt(row.remaining_qty), 0);
    if (distributed_qty > totalRemaining) {
      return res.status(400).json({ message: `Cannot distribute ${distributed_qty}, only ${totalRemaining} remaining in total.` });
    }

    let remainingToDistribute = distributed_qty;

    for (const row of books) {
      const { id, book_id, remaining_qty } = row;

      // Check scanned count
      const scanCountRes = await pool.query(
        `SELECT COUNT(*) FROM tbc_book_tracking WHERE book_id = $1 AND udise_code = $2`,
        [book_id, udise_code]
      );
      const scannedCount = parseInt(scanCountRes.rows[0].count);

      let newDistributedQty = Math.min(remaining_qty, remainingToDistribute);

      // Scan validation
      if (newDistributedQty < scannedCount) {
        return res.status(400).json({
          message: `Cannot reduce below scanned count for book_id ${book_id}. Scanned: ${scannedCount}`
        });
      }

      await pool.query(
        `UPDATE tbc_school_challan_books
         SET distributed_qty = $1, distributed_by = $2
         WHERE id = $3`,
        [newDistributedQty, user_id, id]
      );

      remainingToDistribute -= newDistributedQty;
      if (remainingToDistribute <= 0) break;
    }

    res.json({ message: "Distributed quantities updated successfully." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating distributed quantities", error: err.message });
  }
};

const confirmSchoolBookSingleReceipt = async (req, res) => {
    /* #swagger.tags = ['To School'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const teacher_id = req.user.user_id;
    const { challan_id, book_id, received_qty,udise_code } = req.body;

    const challanCheck = await pool.query(
      `SELECT * FROM tbc_school_challans WHERE id = $1 AND udise_code = $2`,
      [challan_id, udise_code]
    );
    if (!challanCheck.rows.length) {
      return res.status(404).json({ success:false,message: "Invalid challan or not assigned to this school" });
    }

    await pool.query(
      `UPDATE tbc_school_challan_books 
       SET received_qty = $1
       WHERE challan_id = $2 AND book_id = $3`,
      [received_qty, challan_id, book_id]
    );

    await pool.query(
      `UPDATE tbc_school_challan_books 
       SET received_status = TRUE, received_at = CURRENT_TIMESTAMP, received_by = $2
       WHERE id = $1`,
      [challan_id,teacher_id]
    );

    res.json({ success:true,message: "Book marked as received successfully." });
  } catch (err) {
    res.status(500).json({ success:false,message: "Error confirming book receipt", error: err.message });
  }
};

const scanBookCode = async (req, res) => {
    /* #swagger.tags = ['To School'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const teacher_id = req.user.user_id;
    const { isbn_code, barcode_value } = req.body;

    const isbnRes = await pool.query(
      `SELECT * FROM tbc_isbn_codes WHERE isbn_code = $1`,
      [isbn_code]
    );
    if (!isbnRes.rows.length) {
      return res.status(404).json({ message: "Invalid ISBN code" });
    }

    const barcodeStr = barcode_value.toString();
    const series_number = barcodeStr.slice(-8);

    const rest = barcodeStr.slice(0, barcodeStr.length - 8);
    const publisher_id = parseInt(rest.slice(-3)); 
    const order_id = parseInt(rest.slice(0, rest.length - 3));

    const full_code_number = parseInt(barcodeStr); 

    const barcodeRes = await pool.query(
      `SELECT * FROM tbc_generated_barcodes 
       WHERE order_id = $1 AND publisher_id = $2 
         AND $3 BETWEEN start_barcode AND end_barcode`,
      [order_id, publisher_id, full_code_number]
    );

    if (!barcodeRes.rows.length) {
      return res.status(404).json({ message: "Invalid or unauthorized barcode" });
    }

    const barcodeRow = barcodeRes.rows[0];
    
    const alreadyScanned = await pool.query(
      `SELECT * FROM tbc_book_tracking 
       WHERE unique_code = $1 AND isbn = $2`,
      [barcode_value, isbn_code]
    );
    if (alreadyScanned.rows.length) {
      return res.status(400).json({ message: "Barcode already scanned" });
    }

    await pool.query(
      `INSERT INTO tbc_book_tracking 
       (isbn, unique_code, book_id, challan_id, school_id,udise_code, scanned_yn, scanned_at, scanned_by)
       VALUES ($1, $2, $3, $4, $5, $6,TRUE, CURRENT_TIMESTAMP, $5)`,
      [
        isbn_code,
        barcode_value,
        barcodeRow.book_id,
        null, 
        teacher_id,
        udise_code
      ]
    );

    await pool.query(
      `UPDATE tbc_school_challan_books SET remaining_qty = remaining_qty - 1 
       WHERE book_id = $1 AND challan_id IN (
         SELECT id FROM tbc_school_challans WHERE school_id = $2 AND received_yn = TRUE
       ) AND remaining_qty > 0
       LIMIT 1`,
      [barcodeRow.book_id, teacher_id]
    );

    res.json({ message: "Book scan recorded and stock updated" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error scanning book", error: err.message });
  }
};

const getBooksCount = async (req, res) => {
      /* #swagger.tags = ['To School'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {

    const { udise_code } = req.params;
    const result = await pool.query(
      `WITH student_counts AS (
  SELECT
    udise_sch_code,
    sch_category_id,
    ARRAY[
      cls1t, cls2t, cls3t, cls4t, cls5t,
      cls6t, cls7t, cls8t, cls9t, cls10t,
      cls11t, cls12t
    ] AS total_students
  FROM central_student_counts
  WHERE udise_sch_code = $1
),
book_data AS (
  SELECT
    b.udise_code,
    sb.class_level,
    COUNT(DISTINCT sb.id) AS subject_count,
    SUM(b.quantity) AS total_books
  FROM tbc_school_challan_books b
  JOIN tbc_books bk ON b.book_id = bk.id
  JOIN mst_subjects sb ON bk.subject_id = sb.id
  WHERE b.udise_code = $1
  GROUP BY b.udise_code, sb.class_level
)
SELECT
  sc.sch_category_id,
  gs.class_level,
  gs.total_students,
  COALESCE(bd.subject_count, 0) AS subject_count,
  COALESCE(bd.total_books, 0) AS total_books
FROM student_counts sc
CROSS JOIN LATERAL (
  SELECT i AS class_level, sc.total_students[i] AS total_students
  FROM generate_subscripts(sc.total_students, 1) AS i
) gs
LEFT JOIN book_data bd ON bd.class_level::int = gs.class_level::int
WHERE gs.class_level::int = ANY (
  CASE sc.sch_category_id
    WHEN 1 THEN ARRAY[1,2,3,4,5]
    WHEN 2 THEN ARRAY[1,2,3,4,5,6,7,8]
    WHEN 3 THEN ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]
    WHEN 4 THEN ARRAY[6,7,8]
    WHEN 5 THEN ARRAY[6,7,8,9,10,11,12]
    WHEN 6 THEN ARRAY[1,2,3,4,5,6,7,8,9,10]
    WHEN 7 THEN ARRAY[6,7,8,9,10]
    WHEN 8 THEN ARRAY[9,10]
    WHEN 10 THEN ARRAY[9,10,11,12]
    WHEN 11 THEN ARRAY[11,12]
    ELSE ARRAY[]::int[]
  END
);
`,
      [udise_code]
    );
    res.json({success:true, data: result.rows });
  } catch (error) {
    console.log(error)
    res.status(500).json({success:false, message: 'Error fetching book count', error: error.message });
  }
};
const getClasswiseSubjectBookCount = async (req, res) => {
  try {
    const { udise_code, class_level } = req.body;

    const result = await pool.query(
      `
      WITH student_count AS (
        SELECT
          CASE $1
            WHEN 1 THEN cls1t
            WHEN 2 THEN cls2t
            WHEN 3 THEN cls3t
            WHEN 4 THEN cls4t
            WHEN 5 THEN cls5t
            WHEN 6 THEN cls6t
            WHEN 7 THEN cls7t
            WHEN 8 THEN cls8t
            WHEN 9 THEN cls9t
            WHEN 10 THEN cls10t
            WHEN 11 THEN cls11t
            WHEN 12 THEN cls12t
          END AS total_students
        FROM central_student_counts
        WHERE udise_sch_code = $2
      ),
      subject_books AS (
        SELECT 
          sb.name AS subject_name,
          SUM(cb.quantity) AS total_books
        FROM tbc_school_challan_books cb
        JOIN tbc_books b ON cb.book_id = b.id
        JOIN mst_subjects sb ON b.subject_id = sb.id
        WHERE cb.udise_code = $2
          AND sb.class_level = $1
        GROUP BY sb.name
      )
      SELECT 
        subject_books.subject_name,
        subject_books.total_books,
        student_count.total_students
      FROM subject_books
      CROSS JOIN student_count;
      `,
      [class_level, udise_code]
    );

    res.json({
      udise_code,
      class_level,
      data: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching subject-wise book count", error: err.message });
  }
};

module.exports = {
    addBookDistribution,
    getBookDistribution,
    getBookDistributionDetails,
    confirmSchoolBookReceipt,
    confirmSchoolBookSingleReceipt,
    scanBookCode,
    getBooksCount,
    getClasswiseSubjectBookCount,
    updateSchoolBookDistribution
};