const { pool } = require("../../config/db");

const booksStdCount = async (req, res) => {
  /* #swagger.tags = ['School Mobile Api'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const { udisecode, medium = '1' } = req.params;
    const result = await pool.query(
      `WITH student_totals AS (
  SELECT
    gs.class,
    CASE gs.class
      WHEN  1 THEN cs.class_1
      WHEN  2 THEN cs.class_2
      WHEN  3 THEN cs.class_3
      WHEN  4 THEN cs.class_4
      WHEN  5 THEN cs.class_5
    END AS students
  FROM public.cluster_student_count cs
  CROSS JOIN generate_series(1,10) AS gs(class)
  WHERE cs.udise_sch_code = $1
),
subject_counts AS (
  SELECT
    class_level::int AS class,
    COUNT(*)         AS subjects
  FROM public.mst_subjects where medium = $1
  GROUP BY class_level
),
received_counts AS (
SELECT sum(sch.quantity) as received_qty,b.class_level::int AS class FROM public.tbc_school_challan_books as sch
join tbc_books as b on b.id = sch.book_id
where udise_code = $1 
group by b.class_level
)
SELECT
  ROW_NUMBER() OVER (ORDER BY st.class) AS sn,
  st.class,
  st.students,
  COALESCE(rc.received_qty, 0) AS recieved_count,
  COALESCE(sc.subjects, 0) AS subjects
FROM student_totals st
LEFT JOIN subject_counts sc USING (class)
LEFT JOIN received_counts rc ON rc.class = st.class
ORDER BY st.class;
`,
      [udisecode]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching book count', error: error.message });
  }
};

const getSubjectWiseStd2 = async (req, res) => {
  try {
    const { udise_code, class_level, medium } = req.body;

    const result = await pool.query(
      `WITH student_count AS (
  SELECT
    CASE $1::int
      WHEN  1 THEN cls1t
      WHEN  2 THEN cls2t
      WHEN  3 THEN cls3t
      WHEN  4 THEN cls4t
      WHEN  5 THEN cls5t
      WHEN  6 THEN cls6t
      WHEN  7 THEN cls7t
      WHEN  8 THEN cls8t
      WHEN  9 THEN cls9t
      WHEN 10 THEN cls10t
    END AS total_students
  FROM public.central_student_counts
  WHERE udise_sch_code = $2
),
subject_list AS (
  SELECT
    id            AS subject_id,
    name          AS subject_name,
    class_level::int AS class
  FROM public.mst_subjects
  WHERE class_level::int = $1
    AND medium = $3
),
tracking_cte AS (
  SELECT
    subject_id,
    COUNT(*) AS scan_count
  FROM public.tbc_book_tracking
  WHERE udise_code = $2
  GROUP BY subject_id
),
challan_cte AS (
  SELECT
    b.subject_id,
    scb.distributed_qty,
    scb.received_qty,
    scb.quantity,
    scb.received_status,
    scb.id
  FROM public.tbc_school_challan_books scb
  JOIN public.tbc_books b
    ON b.id = scb.book_id
  WHERE scb.udise_code = $2
),
aggregated_challan AS (
  SELECT
    subject_id,
    id AS book_id,
    SUM(distributed_qty::int) AS total_distributed_qty,
    SUM(received_qty)    AS total_received_qty,
    SUM(quantity)        AS total_quantity,
     BOOL_AND(received_status) AS received_status
  FROM challan_cte
  GROUP BY subject_id , id
)
SELECT
  ROW_NUMBER() OVER (ORDER BY sl.subject_id) AS sn,
  sl.subject_name,
  sl.subject_id,
  sl.class,
  sc.total_students    AS student_count,
  COALESCE(tc.scan_count, 0)          AS scan_count,
  ac.total_distributed_qty AS distributed_qty,
  ac.total_received_qty    AS received_qty,
  ac.total_quantity        AS quantity,
  ac.received_status AS received_status,
  ac.book_id AS book_id
FROM subject_list sl
CROSS JOIN student_count sc
LEFT JOIN tracking_cte tc
  ON tc.subject_id = sl.subject_id
INNER JOIN aggregated_challan ac -- Changed to INNER JOIN
  ON ac.subject_id = sl.subject_id
ORDER BY sl.subject_id;
      `,
      [class_level, udise_code, medium]
    );

    res.json({
      udise_code,
      class_level,
      data: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error fetching subject-wise book count",
      error: err.message
    });
  }
};

const getSubjectWiseStd = async (req, res) => {
  try {
    const { udise_code, class_level, medium } = req.body;


    const result = await pool.query(
      `WITH student_count AS (
  SELECT
    CASE $1::int
      WHEN  1 THEN cls1t
      WHEN  2 THEN cls2t
      WHEN  3 THEN cls3t
      WHEN  4 THEN cls4t
      WHEN  5 THEN cls5t
      WHEN  6 THEN cls6t
      WHEN  7 THEN cls7t
      WHEN  8 THEN cls8t
      WHEN  9 THEN cls9t
      WHEN 10 THEN cls10t
    END AS total_students
  FROM public.central_student_counts
  WHERE udise_sch_code = $2
),
subject_list AS (
  SELECT
    id AS subject_id,
    name AS subject_name,
    class_level::int AS class
  FROM public.mst_subjects
  WHERE class_level::int = $1 AND medium = $3
),
tracking_cte AS (
  SELECT
    subject_id,
    COUNT(*) AS scan_count
  FROM public.tbc_book_tracking
  WHERE udise_code = $2
  GROUP BY subject_id
),
challan_cte AS (
  SELECT scb.id,
    scb.distributed_qty,
    scb.received_qty,
    b.subject_id,
    scb.challan_id,
    scb.received_status,
    scb.quantity
  FROM public.tbc_school_challan_books scb
  JOIN public.tbc_books b ON b.id = scb.book_id
  WHERE scb.udise_code = $2
)
SELECT
  ROW_NUMBER() OVER (ORDER BY sl.subject_id) AS sn,
  sl.subject_name,
  sl.subject_id,
  sl.class,
  sc.total_students AS student_count,
  COALESCE(tc.scan_count, 0) AS scan_count,
  ch.distributed_qty,
  ch.received_qty,
  ch.challan_id,
  ch.id AS book_id,
  ch.received_status,
  ch.quantity
FROM subject_list sl
JOIN challan_cte ch ON ch.subject_id = sl.subject_id
CROSS JOIN student_count sc
LEFT JOIN tracking_cte tc ON tc.subject_id = sl.subject_id
ORDER BY sl.subject_id;
`,
      [class_level, udise_code, medium]
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


const scanCode = async (req, res) => {
  /* #swagger.tags = ['School Mobile Api'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const teacher_id = req.user.user_id;
    const { isbn_code, barcode_value, udise_code } = req.body;

    // Check if ISBN exists
    const isbnRes = await pool.query(
      `SELECT * FROM tbc_isbn_codes WHERE isbn_code = $1`,
      [isbn_code]
    );
    if (!isbnRes.rows.length) {
      return res.status(404).json({ message: "Invalid ISBN code" });
    }

    // Parse barcode
    const barcodeStr = barcode_value.toString();
    const series_number = barcodeStr.slice(-8);
    const rest = barcodeStr.slice(0, barcodeStr.length - 8);
    const publisher_id = parseInt(rest.slice(-3));
    const order_id = parseInt(rest.slice(0, rest.length - 3));
    const full_code_number = parseInt(barcodeStr);



    // Validate barcode
    const barcodeRes = await pool.query(
      `SELECT
        gb.*, ic.subject_id,
        ic.id    AS isbn_id
      FROM tbc_generated_barcodes AS gb
      JOIN tbc_books        AS ic
        ON ic.id = gb.book_id
       AND ic.isbn_code = $1
      JOIN tbc_books AS sa
        on sa.id = ic.id
      WHERE gb.order_id     = $2
        AND gb.publisher_id = $3
        AND $4 BETWEEN gb.start_barcode AND gb.end_barcode`,
      [isbn_code, order_id, publisher_id, full_code_number]
    );
    if (!barcodeRes.rows.length) {
      return res.status(404).json({ success: false, message: "Invalid or unauthorized barcode" });
    }

    const barcodeRow = barcodeRes.rows[0];

    // Check if already scanned
    const alreadyScanned = await pool.query(
      `SELECT 1 FROM tbc_book_tracking 
         WHERE unique_code = $1 AND isbn = $2`,
      [barcode_value, isbn_code]
    );
    if (alreadyScanned.rows.length) {
      return res.status(400).json({ success: false, message: "Barcode already scanned" });
    }
    const checkQuantity = await pool.query(`SELECT * FROM tbc_school_challan_books where udise_code=$1 AND book_id=$2 AND challan_id IN (SELECT id FROM tbc_school_challans WHERE udise_code = $1 AND received_status = TRUE
    );`,
      [
        udise_code,
        barcodeRow.book_id
      ]);
    console.log(checkQuantity.rows[0].remaining_qty);

    if (checkQuantity.rows[0].remaining_qty === 0) {
      return res.status(400).json({ success: false, message: "Book quantity is zero, You cant scan more books" });
    }

    // Insert tracking entry
    await pool.query(
      `INSERT INTO tbc_book_tracking 
          (isbn, unique_code, book_id, challan_id, school_id, udise_code, scanned_yn, scanned_at, scanned_by,subject_id)
         VALUES ($1, $2, $3, NULL, $4, $5, TRUE, CURRENT_TIMESTAMP, $4,$6)`,
      [
        isbn_code,
        barcode_value,
        barcodeRow.book_id,
        teacher_id,
        udise_code,
        barcodeRow.subject_id
      ]
    );

    await pool.query(
      `WITH to_update AS (
        SELECT ctid
        FROM tbc_school_challan_books
        WHERE book_id = $1
          AND challan_id   IN (
            SELECT id
            FROM tbc_school_challans
            WHERE udise_code = $2
              AND received_status = TRUE
          )
          AND remaining_qty > 0
        LIMIT 1
      )
      UPDATE tbc_school_challan_books AS b
      SET remaining_qty = b.remaining_qty - 1
      FROM to_update u
      WHERE b.ctid = u.ctid;`,
      [barcodeRow.book_id, udise_code]
    );

    res.json({ success: true, message: "Book scan recorded successfully." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error scanning book", error: err.message });
  }
};

const bookRecieveMulti = async (req, res) => {
  /* #swagger.tags = ['School Mobile Api'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const school_id = req.user.user_id;
    const { challan_id, books } = req.body;

    const challanCheck = await pool.query(
      `SELECT * FROM tbc_school_challans WHERE id = $1 AND school_id = $2`,
      [challan_id, school_id]
    );
    if (!challanCheck.rows.length) {
      return res.status(404).json({ message: "Invalid challan or not assigned to this school" });
    }

    for (let book of books) {
      const { book_id, received_qty } = book;

      await pool.query(
        `UPDATE tbc_school_challan_books 
         SET received_qty = $1, received_status = TRUE
         WHERE challan_id = $2 AND book_id = $3`,
        [received_qty, challan_id, book_id]
      );
    }


    await pool.query(
      `UPDATE tbc_school_challans 
       SET received_status = TRUE, received_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [challan_id]
    );

    res.json({ message: "Books marked as received successfully." });
  } catch (err) {
    res.status(500).json({ message: "Error confirming book receipt", error: err.message });
  }
};

const bookRecieveSingle = async (req, res) => {
  /* #swagger.tags = ['School Mobile Api'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const school_id = req.user.user_id;
    const { challan_id, book_id, received_qty } = req.body;

    const challanCheck = await pool.query(
      `SELECT * FROM tbc_school_challans WHERE id = $1 AND school_id = $2`,
      [challan_id, school_id]
    );
    if (!challanCheck.rows.length) {
      return res.status(404).json({ success: false, message: "Invalid challan or not assigned to this school" });
    }

    await pool.query(
      `UPDATE tbc_school_challan_books 
       SET received_qty = $1
       WHERE challan_id = $2 AND book_id = $3`,
      [received_qty, challan_id, book_id]
    );

    await pool.query(
      `UPDATE tbc_school_challan_books 
       SET received_status = TRUE, received_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [challan_id]
    );

    res.json({ success: true, message: "Book marked as received successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error confirming book receipt", error: err.message });
  }
};


const scanBarCode = async (req, res) => {
  /* #swagger.tags = ['School Mobile Api'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const { barcode_value } = req.body;

    if (barcode_value.length < 12) {
      return res.status(400).json({ message: "Invalid barcode" });
    }
    // Parse barcode
    const barcodeStr = barcode_value.toString();
    const series_number = barcodeStr.slice(-8);
    const rest = barcodeStr.slice(0, barcodeStr.length - 8);
    const publisher_id = parseInt(rest.slice(-3));
    const order_id = parseInt(rest.slice(0, rest.length - 3));
    const full_code_number = parseInt(barcodeStr);



    // Validate barcode
    const barcodeRes = await pool.query(
      `SELECT gb.* FROM tbc_generated_barcodes AS gb WHERE gb.order_id = $1 AND gb.publisher_id = $2 AND $3 BETWEEN gb.start_barcode AND gb.end_barcode`,
      [order_id, publisher_id, full_code_number]
    );
    if (!barcodeRes.rows.length) {
      return res.status(404).json({ message: "Invalid barcode" });
    }
    const checkBarCodeScanned = await pool.query('SELECT * FROM tbc_book_tracking WHERE unique_code = $1', [barcode_value]);
    if (!checkBarCodeScanned.rows.length) {
      return res.status(400).json({ message: "This Code Does Not Scanned Yet By Anyone" });
    }

    // Check if already scanned
    const scannedCode = await pool.query(
      `SELECT tbt.id,ms.udise_sch_code, ms.school_name,ms.district_name,ms.block_name,ms.cluster_name,mt.emp_name as scanned_by,mt.tch_type as designation FROM tbc_book_tracking as tbt
      LEFT JOIN mst_schools as ms ON ms.udise_sch_code = tbt.udise_code
      LEFT JOIN mst_users as mu ON mu.user_id = tbt.scanned_by
      LEFT JOIN mst_teacher as  mt ON mt.nat_tch_id = mu.column_value 
      WHERE unique_code = $1`,
      [barcode_value]
    );

    // Insert tracking entry

    res.json({ message: "Details Fetched successfully.", data: scannedCode.rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error scanning book", error: err.message });
  }
};



module.exports = {
  booksStdCount,
  getSubjectWiseStd,
  scanCode,
  bookRecieveMulti,
  bookRecieveSingle,
  scanBarCode,
  getSubjectWiseStd2
};