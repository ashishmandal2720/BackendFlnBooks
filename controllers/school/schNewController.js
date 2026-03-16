const { isbn } = require("bwip-js/node");
const { pool } = require("../../config/db");

// const booksStdCount = async (req, res) => {
//   /* #swagger.tags = ['School Mobile Api'] */
//   /* #swagger.security = [{ "Bearer": [] }] */
//   try {
//     const { udisecode, medium = '1' } = req.params;

//     const result = await pool.query(
//       `
//       WITH student_totals AS (
//         SELECT 
//           gs.class,
//           CASE gs.class
//             WHEN 9 THEN vsd.class_9
//             WHEN 10 THEN vsd.class_10
//             WHEN 11 THEN vsd.class_11
//             WHEN 12 THEN vsd.class_12
//             ELSE 0
//           END AS students
//         FROM generate_series(9, 12) AS gs(class)
//         LEFT JOIN vtp_student_data vsd ON vsd.udise_sch_code = $1
//         WHERE vsd.udise_sch_code = $1
//       ),
//       subject_counts AS (
//         SELECT
//           class_level::int AS class,
//           COUNT(*) AS subjects
//         FROM mst_subjects 
//         WHERE medium = $2
//         GROUP BY class_level
//       ),
//       received_counts AS (
//         SELECT 
//           SUM(sch.quantity) AS received_qty,
//           b.class_level::int AS class 
//         FROM tbc_school_challan_books AS sch
//         JOIN tbc_books AS b ON b.id = sch.book_id
//         WHERE udise_code = $1 
//         GROUP BY b.class_level
//       )
//       SELECT
//         ROW_NUMBER() OVER (ORDER BY st.class) AS sn,
//         st.class,
//         COALESCE(st.students, 0) AS students,
//         COALESCE(rc.received_qty, 0) AS recieved_count,
//         COALESCE(sc.subjects, 0) AS subjects
//       FROM student_totals st
//       LEFT JOIN subject_counts sc USING (class)
//       LEFT JOIN received_counts rc ON rc.class = st.class
//       ORDER BY st.class;
//       `,
//       [udisecode, medium]
//     );

//     res.json({ success: true, data: result.rows });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching book count',
//       error: error.message
//     });
//   }
// };


// const getSubjectWiseStd2 = async (req, res) => {
//   try {
//     const { udise_code, class_level, medium } = req.body;

//     // Main query for subject/book data
//     const result = await pool.query(
//       `
//       WITH subject_list AS (
//         SELECT
//           id AS subject_id,
//           name AS subject_name,
//           class_level::int AS class
//         FROM mst_subjects
//   WHERE class_level::int = $1
//           AND medium IN (4, 19,14,18)
//       ),

//       tracking_cte AS (
//         SELECT
//           subject_id,
//           COUNT(*) AS scan_count
//         FROM tbc_book_tracking
//         WHERE udise_code = $2
//         GROUP BY subject_id
//       ),

//       challan_cte AS (
//         SELECT
//           b.subject_id,
//           scb.distributed_qty,
//           scb.received_qty,
//           scb.quantity,
//           scb.received_status,
//           scb.remaining_qty,
//           scb.id AS book_id,
//           scb.book_id as b_id
//         FROM tbc_school_challan_books scb
//         JOIN tbc_books b ON b.id = scb.book_id
//         WHERE scb.udise_code = $2
//       ),

// aggregated_challan AS (
//   SELECT
//     subject_id,
//     SUM(distributed_qty::int) AS total_distributed_qty,
//     SUM(received_qty) AS total_received_qty,
//     SUM(quantity) AS total_quantity,
//     SUM(remaining_qty) AS total_remaining_quantity,
//     BOOL_AND(received_status) AS received_status,
//     MIN(book_id) AS book_id,
//     MIN(b_id) AS b_id
//   FROM challan_cte
//   GROUP BY subject_id
// )
//       SELECT
//         ROW_NUMBER() OVER (ORDER BY sl.subject_id) AS sn,
//         sl.subject_name,
//         sl.subject_id,
//         sl.class,
//         COALESCE(tc.scan_count, 0) AS scan_count,
//         ac.total_distributed_qty AS distributed_qty,
//         ac.total_received_qty AS received_qty,
//         ac.total_remaining_quantity AS remaining_qty,
//         ac.total_quantity AS quantity,
//         ac.received_status AS received_status,
//         ac.book_id,
//         ac.b_id

//       FROM subject_list sl
//       LEFT JOIN tracking_cte tc ON tc.subject_id = sl.subject_id
//       INNER JOIN aggregated_challan ac ON ac.subject_id = sl.subject_id
//       ORDER BY sl.subject_id
//       `,
//       [class_level, udise_code]
//     );

//     // If no books found
//     if (result.rows.length === 0) {
//       return res.status(200).json({
//         success: true,
//         udise_code,
//         class_level,
//         message: "Books not received",
//         data: []
//       });
//     }

//     // Fetch Hindi/English student counts (optional use)
//     const studentResult = await pool.query(
//       `
//       WITH primary_counts AS (
//         SELECT 
//           csc.moi,
//           CASE $2::int
//             WHEN 1 THEN csc.class_1
//             WHEN 2 THEN csc.class_2
//             WHEN 3 THEN csc.class_3
//             WHEN 4 THEN csc.class_4
//             WHEN 5 THEN csc.class_5
//             WHEN 6 THEN csc.class_6
//             WHEN 7 THEN csc.class_7
//             WHEN 8 THEN csc.class_8
//             WHEN 9 THEN sc.class_9
//             WHEN 10 THEN sc.class_10
//           END AS student_count
//         FROM cluster_student_count csc
//         LEFT JOIN student_counts sc
//           ON sc.school_udise_code = csc.udise_sch_code 
//          AND sc.school_medium::INT = csc.moi
//         WHERE csc.udise_sch_code = $1 AND csc.moi IN (4, 19,14,18)
//       ),
//       fallback_counts AS (
//         SELECT 
//           sc.school_medium::INT AS moi,
//           CASE $2::int
//             WHEN 1 THEN sc.class_1
//             WHEN 2 THEN sc.class_2
//             WHEN 3 THEN sc.class_3
//             WHEN 4 THEN sc.class_4
//             WHEN 5 THEN sc.class_5
//             WHEN 6 THEN sc.class_6
//             WHEN 7 THEN sc.class_7
//             WHEN 8 THEN sc.class_8
//             WHEN 9 THEN sc.class_9
//             WHEN 10 THEN sc.class_10
//         END AS student_count
//         FROM student_counts sc
//         WHERE sc.school_udise_code = $1 AND sc.school_medium::INT IN (4, 19,18,14)
//           AND NOT EXISTS (
//             SELECT 1 FROM cluster_student_count c
//             WHERE c.udise_sch_code = $1 AND c.moi IN (4, 19,18,14)
//           )
//       )
//       SELECT 
//         CASE 
//           WHEN moi = 4 THEN 'student_count_hindi'
//           WHEN moi = 19 THEN 'student_count_english'
//           WHEN moi = 14 THEN 'student_count_sanskrit'
//           WHEN moi = 18 THEN 'student_count_urdu'
//         END AS label,
//         student_count
//       FROM primary_counts
//       UNION ALL
//       SELECT 
//         CASE 
//           WHEN moi = 4 THEN 'student_count_hindi'
//           WHEN moi = 19 THEN 'student_count_english'
//           WHEN moi = 14 THEN 'student_count_sanskrit'
//         END AS label,
//         student_count
//       FROM fallback_counts
//       `,
//       [udise_code, class_level]
//     );

//     // Format counts
//     const studentCounts = {};
//     for (const row of studentResult.rows) {
//       if (row.label && row.student_count !== null) {
//         studentCounts[row.label] = parseInt(row.student_count, 10);
//       }
//     }

//     // Final response
//     res.json({
//       success: true,
//       message: "Subject-wise book count fetched successfully",
//       udise_code,
//       class_level,
//       ...studentCounts,
//       data: result.rows
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching subject-wise book count",
//       error: err.message
//     });
//   }
// };

const booksStdCount = async (req, res) => {
  try {
    const { udisecode } = req.params;

    const result = await pool.query(
      `
      WITH student_totals AS (
        SELECT 
          gs.class,
          CASE gs.class
            WHEN 1 THEN csc.class_1
            WHEN 2 THEN csc.class_2
            WHEN 3 THEN csc.class_3
            WHEN 4 THEN csc.class_4
            WHEN 5 THEN csc.class_5
            ELSE 0
          END AS students
        FROM generate_series(1, 5) AS gs(class)
        LEFT JOIN cluster_student_count csc 
          ON csc.udise_sch_code = $1
      ),
      subject_counts AS (
        SELECT
          class_level::int AS class,
          COUNT(*) AS subjects
        FROM mst_subjects 
        GROUP BY class_level
      ),
      received_counts AS (
        SELECT 
          SUM(sch.quantity) AS received_qty,
          b.class_level::int AS class 
        FROM tbc_school_challan_books AS sch
        JOIN tbc_books AS b ON b.id = sch.book_id
        WHERE sch.udise_code = $1 
        GROUP BY b.class_level
      )
      SELECT
        ROW_NUMBER() OVER (ORDER BY st.class) AS sn,
        st.class,
        COALESCE(st.students, 0) AS students,
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
    res.status(500).json({
      success: false,
      message: 'Error fetching book count',
      error: error.message
    });
  }
};

const getSubjectWiseStd2 = async (req, res) => {
  try {
    const { udise_code, class_level, medium } = req.body;

    const result = await pool.query(
      `
      WITH subject_list AS (
        SELECT
          id AS subject_id,
          name AS subject_name,
          class_level::int AS class
        FROM mst_subjects
        WHERE class_level::int = $1
          AND medium IN (1,2)
      ),
      
      tracking_cte AS (
        SELECT
          subject_id,
          COUNT(*) AS scan_count
        FROM tbc_book_tracking
        WHERE udise_code = $2
        GROUP BY subject_id
      ),

      challan_cte AS (
        SELECT
          subject_id,
          distributed_qty,
          received_qty,
          quantity,
          received_status,
          remaining_qty,
          id AS book_id,
          book_id as b_id
        FROM tbc_school_challan_books
        WHERE udise_code = $2
      ),

      aggregated_challan AS (
        SELECT
          subject_id,
          SUM(distributed_qty::int) AS total_distributed_qty,
          SUM(received_qty) AS total_received_qty,
          SUM(quantity) AS total_quantity,
          SUM(remaining_qty) AS total_remaining_quantity,
          BOOL_AND(received_status) AS received_status,
          MIN(book_id) AS book_id,
          MIN(b_id) AS b_id
        FROM challan_cte
        GROUP BY subject_id
      )

      SELECT
        ROW_NUMBER() OVER (ORDER BY sl.subject_id) AS sn,
        sl.subject_name,
        sl.subject_id,
        sl.class,
        COALESCE(tc.scan_count, 0) AS scan_count,
        ac.total_distributed_qty AS distributed_qty,
        ac.total_received_qty AS received_qty,
        ac.total_remaining_quantity AS remaining_qty,
        ac.total_quantity AS quantity,
        ac.received_status AS received_status,
        ac.book_id,
        ac.b_id
      FROM subject_list sl
      LEFT JOIN tracking_cte tc ON tc.subject_id = sl.subject_id
      INNER JOIN aggregated_challan ac ON ac.subject_id = sl.subject_id
      ORDER BY sl.subject_id
      `,
      [class_level, udise_code]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        udise_code,
        class_level,
        message: "Books not received",
        data: []
      });
    }

    // Student count now from vtp_student_data
    const studentResult = await pool.query(
      `
      SELECT 
        CASE 
          WHEN $2::int = 9 THEN class_9
          WHEN $2::int = 10 THEN class_10
          WHEN $2::int = 11 THEN class_11
          WHEN $2::int = 12 THEN class_12
        END AS student_count
      FROM vtp_student_data
      WHERE udise_sch_code = $1
      `,
      [udise_code, class_level]
    );

    const totalStudents = studentResult.rows[0]?.student_count ?? 0;

    res.json({
      success: true,
      message: "Subject-wise book count fetched successfully",
      udise_code,
      class_level,
      student_count: parseInt(totalStudents, 10),
      data: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error fetching subject-wise book count",
      error: err.message
    });
  }
};


const SubjectWiseStdOff2 = async (req, res) => {
  try {
    const { udise_code } = req.body;

    const result = await pool.query(
      `
      WITH subject_list AS (
        SELECT
          id AS subject_id,
          name AS subject_name,
          class_level::int AS class
        FROM mst_subjects
        WHERE medium IN (4, 19)
      ),

      tracking_cte AS (
        SELECT
          subject_id,
          COUNT(*) AS scan_count
        FROM tbc_book_tracking
        WHERE udise_code = $1
        GROUP BY subject_id
      ),

      challan_cte AS (
        SELECT
          b.subject_id,
          scb.distributed_qty,
          scb.received_qty,
          scb.quantity,
          scb.received_status,
          scb.remaining_qty,
          scb.id AS book_id,
          scb.book_id as b_id
        FROM tbc_school_challan_books scb
        JOIN tbc_books b ON b.id = scb.book_id
        WHERE scb.udise_code = $1
      ),

      aggregated_challan AS (
        SELECT
          subject_id,
          SUM(distributed_qty::int) AS total_distributed_qty,
          SUM(received_qty) AS total_received_qty,
          SUM(quantity) AS total_quantity,
          SUM(remaining_qty) AS total_remaining_quantity,
          BOOL_AND(received_status) AS received_status,
          MIN(book_id) AS book_id,
          MIN(b_id) AS b_id
        FROM challan_cte
        GROUP BY subject_id
      )

      SELECT
        ROW_NUMBER() OVER (ORDER BY sl.subject_id) AS sn,
        sl.subject_name,
        sl.subject_id,
        sl.class,
        COALESCE(tc.scan_count, 0) AS scan_count,
        ac.total_distributed_qty AS distributed_qty,
        ac.total_received_qty AS received_qty,
        ac.total_remaining_quantity AS remaining_qty,
        ac.total_quantity AS quantity,
        ac.received_status AS received_status,
        ac.book_id,
        ac.b_id

      FROM subject_list sl
      LEFT JOIN tracking_cte tc ON tc.subject_id = sl.subject_id
      INNER JOIN aggregated_challan ac ON ac.subject_id = sl.subject_id
      ORDER BY sl.subject_id
      `,
      [udise_code]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        udise_code,
        message: "Books not received",
        data: []
      });
    }

    const studentResult = await pool.query(
      `
WITH cluster_sum AS (
  SELECT
    moi,
    SUM(
      COALESCE(class_1, 0) + COALESCE(class_2, 0) + COALESCE(class_3, 0) +
      COALESCE(class_4, 0) + COALESCE(class_5, 0) + COALESCE(class_6, 0) +
      COALESCE(class_7, 0) + COALESCE(class_8, 0)
    ) AS total
  FROM cluster_student_count
  WHERE udise_sch_code = $1 AND moi IN (4, 19)
  GROUP BY moi
),

student_sum AS (
  SELECT
    school_medium::int AS sm_moi,
    SUM(
      COALESCE(class_1, 0) + COALESCE(class_2, 0) + COALESCE(class_3, 0) +
      COALESCE(class_4, 0) + COALESCE(class_5, 0) + COALESCE(class_6, 0) +
      COALESCE(class_7, 0) + COALESCE(class_8, 0) + COALESCE(class_9, 0) +
      COALESCE(class_10, 0)
    ) AS total
  FROM student_counts
  WHERE school_udise_code = $1 AND school_medium::int IN (4, 19)
  GROUP BY school_medium
),

combined AS (
  SELECT
    m.moi,
    COALESCE(cs.total, 0) + COALESCE(ss.total, 0) AS student_count
  FROM (VALUES (4), (19)) AS m(moi)
  LEFT JOIN cluster_sum cs ON cs.moi = m.moi
  LEFT JOIN student_sum ss ON ss.sm_moi = m.moi
)

SELECT
  CASE 
    WHEN moi = 4 THEN 'student_count_hindi'
    WHEN moi = 19 THEN 'student_count_english'
  END AS label,
  student_count
FROM combined;
      `,
      [udise_code]
    );

    const studentCounts = {};
    for (const row of studentResult.rows) {
      if (row.label && row.student_count !== null) {
        studentCounts[row.label] = parseInt(row.student_count, 10);
      }
    }

    res.json({
      success: true,
      message: "Subject-wise book count fetched successfully",
      udise_code,
      ...studentCounts,
      data: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error fetching subject-wise book count",
      error: err.message
    });
  }
};

// const getSubjectWiseStd = async (req, res) => {
//   try {
//     const { udise_code, class_level } = req.body;

//     // Main data query
//     const result = await pool.query(
//       `
//       WITH subject_list AS (
//         SELECT
//           id AS subject_id,
//           name AS subject_name,
//           medium AS school_medium,
//           class_level::int AS class
//         FROM mst_subjects
//         WHERE class_level::int = $2
//           AND medium IN (4, 19,18,14)
//       ),

//       tracking_cte AS (
//         SELECT
//           subject_id,
//           COUNT(*) AS scan_count
//         FROM tbc_book_tracking
//         WHERE udise_code = $1
//         GROUP BY subject_id
//       ),

//       aggregated_challan AS (
//         SELECT
//           b.subject_id,
//           SUM(scb.distributed_qty::int) AS total_distributed_qty,
//           SUM(scb.received_qty)         AS total_received_qty,
//           SUM(scb.quantity)             AS total_quantity,
//           SUM(scb.remaining_qty)        AS total_remaining_quantity,
//           BOOL_AND(scb.received_status) AS received_status,
//           MIN(scb.id)                   AS book_id,
//           MIN(scb.challan_id)           AS challan_id,
//           MIN(b.id) AS b_id
//         FROM tbc_school_challan_books scb
//         JOIN tbc_books b ON b.id = scb.book_id
//         WHERE scb.udise_code = $1
//         GROUP BY b.subject_id
//       )

//       SELECT
//         ROW_NUMBER() OVER (ORDER BY sl.subject_id) AS sn,
//         sl.subject_name,
//         sl.subject_id,
//         sl.class,
//         COALESCE(tc.scan_count, 0) AS scan_count,
//         ac.total_distributed_qty   AS distributed_qty,
//         ac.total_received_qty      AS received_qty,
//         ac.total_remaining_quantity AS remaining_qty,
//         ac.total_quantity          AS quantity,
//         ac.received_status,
//         ac.book_id,
//         ac.challan_id,
//         ac.b_id,
//         sl.school_medium           AS medium
//       FROM subject_list sl
//       LEFT JOIN tracking_cte tc
//         ON tc.subject_id = sl.subject_id
//       INNER JOIN aggregated_challan ac
//         ON ac.subject_id = sl.subject_id
//       ORDER BY sl.subject_id
//       `,
//       [udise_code, class_level]
//     );

//     // Student count query with fallback
//     const studentResult = await pool.query(
//       `
//       WITH primary_counts AS (
//         SELECT 
//           csc.moi,
//           CASE $2::int
//             WHEN 1 THEN csc.class_1
//             WHEN 2 THEN csc.class_2
//             WHEN 3 THEN csc.class_3
//             WHEN 4 THEN csc.class_4
//             WHEN 5 THEN csc.class_5
//             WHEN 6 THEN csc.class_6
//             WHEN 7 THEN csc.class_7
//             WHEN 8 THEN csc.class_8
//             WHEN 9 THEN sc.class_9
//             WHEN 10 THEN sc.class_10
//           END AS student_count
//         FROM cluster_student_count csc
//         LEFT JOIN student_counts sc
//           ON sc.school_udise_code = csc.udise_sch_code 
//          AND sc.school_medium::INT = csc.moi
//         WHERE csc.udise_sch_code = $1 AND csc.moi IN (4, 19,18,14)
//       ),

//       fallback_counts AS (
//         SELECT 
//           sc.school_medium::INT AS moi,
//           CASE $2::int
//             WHEN 9 THEN sc.class_9
//             WHEN 10 THEN sc.class_10
//             WHEN 1 THEN sc.class_1
//             WHEN 2 THEN sc.class_2
//             WHEN 3 THEN sc.class_3
//             WHEN 4 THEN sc.class_4
//             WHEN 5 THEN sc.class_5
//             WHEN 6 THEN sc.class_6
//             WHEN 7 THEN sc.class_7
//             WHEN 8 THEN sc.class_8
//           END AS student_count
//         FROM student_counts sc
//         WHERE sc.school_udise_code = $1 
//           AND sc.school_medium::INT IN (4, 19,18,14)
//           AND NOT EXISTS (
//             SELECT 1 FROM cluster_student_count c
//             WHERE c.udise_sch_code = $1 AND c.moi IN (4, 19,18,14)
//           )
//       )

//       SELECT 
//         CASE 
//           WHEN moi = 4 THEN 'student_count_hindi'
//           WHEN moi = 19 THEN 'student_count_english'
//           WHEN moi = 14 THEN 'student_count_sanskrit'
//           WHEN moi = 18 THEN 'student_count_urdu'
//         END AS label,
//         student_count
//       FROM primary_counts

//       UNION ALL

//       SELECT 
//         CASE 
//           WHEN moi = 4 THEN 'student_count_hindi'
//           WHEN moi = 19 THEN 'student_count_english'
//           WHEN moi = 14 THEN 'student_count_sanskrit'
//         END AS label,
//         student_count
//       FROM fallback_counts
//       `,
//       [udise_code, class_level]
//     );

//     // Transform student counts to key-value
//     const studentCounts = {};
//     for (const row of studentResult.rows) {
//       if (row.label && row.student_count !== null) {
//         studentCounts[row.label] = parseInt(row.student_count, 10);
//       }
//     }

//     if (result.rows.length === 0) {
//       return res.status(200).json({
//         udise_code,
//         class_level,
//         ...studentCounts,
//         message: "Books not received",
//         data: []
//       });
//     }
//     // Final response
//     res.json({
//       udise_code,
//       class_level,
//       ...studentCounts,
//       data: result.rows
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       message: "Error fetching subject-wise book count",
//       error: err.message
//     });
//   }
// };

const getSubjectWiseStd = async (req, res) => {
  try {
    const { udise_code, class_level } = req.body;

    // Main book challan and scan data query
    const result = await pool.query(
      `
      WITH subject_list AS (
        SELECT
          id AS subject_id,
          name AS subject_name,
          medium AS school_medium,
          class_level::int AS class
        FROM mst_subjects
        WHERE class_level::int = $2
          AND medium IN (4, 19, 18, 14)
      ),

      tracking_cte AS (
        SELECT
          subject_id,
          COUNT(*) AS scan_count
        FROM tbc_book_tracking
        WHERE udise_code = $1
        GROUP BY subject_id
      ),

aggregated_challan AS (
  SELECT
    scb.subject_id,
    SUM(scb.distributed_qty::int) AS total_distributed_qty,
    SUM(scb.received_qty)         AS total_received_qty,
    SUM(scb.quantity)             AS total_quantity,
    SUM(scb.remaining_qty)        AS total_remaining_quantity,
    BOOL_AND(scb.received_status) AS received_status,
    MIN(scb.book_id)              AS book_id,
    MIN(scb.challan_id)           AS challan_id,
    MIN(scb.id)                   AS b_id
  FROM tbc_school_challan_books scb
  WHERE scb.udise_code = $1
  GROUP BY scb.subject_id
)

      SELECT
        ROW_NUMBER() OVER (ORDER BY sl.subject_id) AS sn,
        sl.subject_name,
        sl.subject_id,
        sl.class,
        COALESCE(tc.scan_count, 0) AS scan_count,
        ac.total_distributed_qty   AS distributed_qty,
        ac.total_received_qty      AS received_qty,
        ac.total_remaining_quantity AS remaining_qty,
        ac.total_quantity          AS quantity,
        ac.received_status,
        ac.book_id,
        ac.challan_id,
        ac.b_id,
        sl.school_medium           AS medium
      FROM subject_list sl
      LEFT JOIN tracking_cte tc
        ON tc.subject_id = sl.subject_id
      INNER JOIN aggregated_challan ac
        ON ac.subject_id = sl.subject_id
      ORDER BY sl.subject_id
      `,
      [udise_code, class_level]
    );

    // ✅ Student count from vtp_student_data
    const studentResult = await pool.query(
      `
      SELECT 
        CASE $2::int
          WHEN 9 THEN class_9
          WHEN 10 THEN class_10
          WHEN 11 THEN class_11
          WHEN 12 THEN class_12
        END AS student_count
      FROM vtp_student_data
      WHERE udise_sch_code = $1
      `,
      [udise_code, class_level]
    );

    // Prepare response
    let student_count = 0;
    if (studentResult.rows.length > 0 && studentResult.rows[0].student_count !== null) {
      student_count = parseInt(studentResult.rows[0].student_count, 10);
    }

    if (result.rows.length === 0) {
      return res.status(200).json({
        udise_code,
        class_level,
        student_count,
        message: "Books not received",
        data: []
      });
    }

    res.json({
      udise_code,
      class_level,
      student_count,
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


const subjectWiseStdOff = async (req, res) => {
  try {
    const { udise_code } = req.body;

    // Main data query (no class filter)
    const result = await pool.query(
      `
      WITH subject_list AS (
        SELECT
          id AS subject_id,
          name AS subject_name,
          medium AS school_medium,
          class_level::int AS class
        FROM mst_subjects
        WHERE medium IN (4, 19)
      ),

      tracking_cte AS (
        SELECT
          subject_id,
          COUNT(*) AS scan_count
        FROM tbc_book_tracking
        WHERE udise_code = $1
        GROUP BY subject_id
      ),

      aggregated_challan AS (
        SELECT
          b.subject_id,
          SUM(scb.distributed_qty::int) AS total_distributed_qty,
          SUM(scb.received_qty)         AS total_received_qty,
          SUM(scb.quantity)             AS total_quantity,
          SUM(scb.remaining_qty)        AS total_remaining_quantity,
          BOOL_AND(scb.received_status) AS received_status,
          MIN(scb.id)                   AS book_id,
          MIN(scb.challan_id)           AS challan_id,
          MIN(b.id) AS b_id
        FROM tbc_school_challan_books scb
        JOIN tbc_books b ON b.id = scb.book_id
        WHERE scb.udise_code = $1
        GROUP BY b.subject_id
      )

      SELECT
        ROW_NUMBER() OVER (ORDER BY sl.subject_id) AS sn,
        sl.subject_name,
        sl.subject_id,
        sl.class,
        COALESCE(tc.scan_count, 0) AS scan_count,
        ac.total_distributed_qty   AS distributed_qty,
        ac.total_received_qty      AS received_qty,
        ac.total_remaining_quantity AS remaining_qty,
        ac.total_quantity          AS quantity,
        ac.received_status,
        ac.book_id,
        ac.challan_id,
        ac.b_id,
        sl.school_medium           AS medium
      FROM subject_list sl
      LEFT JOIN tracking_cte tc
        ON tc.subject_id = sl.subject_id
      INNER JOIN aggregated_challan ac
        ON ac.subject_id = sl.subject_id
      ORDER BY sl.subject_id
      `,
      [udise_code]
    );

    // Student count query (no class filter)
    const studentResult = await pool.query(
      `
WITH cluster_sum AS (
  SELECT
    moi,
    SUM(
      COALESCE(class_1, 0) + COALESCE(class_2, 0) + COALESCE(class_3, 0) +
      COALESCE(class_4, 0) + COALESCE(class_5, 0) + COALESCE(class_6, 0) +
      COALESCE(class_7, 0) + COALESCE(class_8, 0)
    ) AS total
  FROM cluster_student_count
  WHERE udise_sch_code = $1 AND moi IN (4, 19)
  GROUP BY moi
),

student_sum AS (
  SELECT
    school_medium::int AS sm_moi,
    SUM(
      COALESCE(class_1, 0) + COALESCE(class_2, 0) + COALESCE(class_3, 0) +
      COALESCE(class_4, 0) + COALESCE(class_5, 0) + COALESCE(class_6, 0) +
      COALESCE(class_7, 0) + COALESCE(class_8, 0) + COALESCE(class_9, 0) +
      COALESCE(class_10, 0)
    ) AS total
  FROM student_counts
  WHERE school_udise_code = $1 AND school_medium::int IN (4, 19)
  GROUP BY school_medium
),

combined AS (
  SELECT
    m.moi,
    COALESCE(cs.total, 0) + COALESCE(ss.total, 0) AS student_count
  FROM (VALUES (4), (19)) AS m(moi)
  LEFT JOIN cluster_sum cs ON cs.moi = m.moi
  LEFT JOIN student_sum ss ON ss.sm_moi = m.moi
)

SELECT
  CASE 
    WHEN moi = 4 THEN 'student_count_hindi'
    WHEN moi = 19 THEN 'student_count_english'
  END AS label,
  student_count
FROM combined;
      `,
      [udise_code]
    );

    const studentCounts = {};
    for (const row of studentResult.rows) {
      if (row.label && row.student_count !== null) {
        studentCounts[row.label] = parseInt(row.student_count, 10);
      }
    }

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        udise_code,
        ...studentCounts,
        message: "Books not received",
        data: []
      });
    }

    // Final response
    res.json({
      success: true,
      udise_code,
      ...studentCounts,
      data: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error fetching subject-wise book count",
      error: err.message
    });
  }
};


const scanCodesBulk = async (req, res) => {
  /* #swagger.tags = ['School Mobile Api'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  const client = await pool.connect();
  try {
    const teacher_id = req.user.user_id;
    const udise_code = req.body.udise_code;
    const barcodes = req.body.barcodes; // [{ isbn_code, barcode_value }]

    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      return res.status(400).json({ message: "No barcode data provided." });
    }

    const results = [];

    for (const item of barcodes) {
      const { isbn_code, barcode_value } = item;

      try {

        let final_isbn = isbn_code;
        if (isbn_code === '9789333000857') {
          final_isbn = '9789324000859';
        } else if (isbn_code === '9789371000291') {
          final_isbn = '9789379001566';
        }

        // Step 1: Validate ISBN
        const isbnRes = await pool.query(
          `SELECT * FROM tbc_isbn_codes WHERE isbn_code = $1`,
          [final_isbn]
        );
        if (!isbnRes.rows.length) {
          return res.status(404).json({ message: "Invalid ISBN code" });
        }

        // Step 2: Decode barcode
        const { order_id, book_id, class_id, publisher_id, full_code_number } = parseBarcode(barcode_value);

        let barcodeRes;

        // Step 3: Try matching by book_id/class_id
        const firstQuery = await pool.query(
          `SELECT gb.*, ic.subject_id, ic.id AS isbn_id
       FROM tbc_generated_barcodes gb
       JOIN tbc_books ic ON ic.id = gb.book_id AND ic.isbn_code = $1
       WHERE gb.book_id = $2 AND gb.class_level = $3
       AND $4 BETWEEN gb.start_barcode AND gb.end_barcode`,
          [final_isbn, book_id, class_id, full_code_number]
        );

        if (firstQuery.rows.length > 0) {
          barcodeRes = firstQuery;
        } else {
          // Step 4: Try fallback by order_id/publisher_id
          const secondQuery = await pool.query(
            `SELECT gb.*, ic.subject_id, ic.id AS isbn_id
         FROM tbc_generated_barcodes gb
         JOIN tbc_books ic ON ic.id = gb.book_id AND ic.isbn_code = $1
         WHERE gb.order_id = $2 AND gb.publisher_id = $3
         AND $4 BETWEEN gb.start_barcode AND gb.end_barcode`,
            [final_isbn, order_id, publisher_id, full_code_number]
          );

          if (secondQuery.rows.length > 0) {
            barcodeRes = secondQuery;
          } else {
            console.log(`Barcode not found in the database.`);

            return res.status(404).json({ success: false, message: "Barcode not found in the database." });
          }
        }

        const barcodeRow = barcodeRes.rows[0];

        // Step 5: Check if already scanned
        const alreadyScanned = await pool.query(
          `SELECT 1 FROM tbc_book_tracking WHERE unique_code = $1 AND isbn = $2`,
          [barcode_value, final_isbn]
        );
        if (alreadyScanned.rows.length) {
          return res.status(400).json({ success: false, message: "Barcode already scanned" });
        }

        // Step 6: Check if any challan row with qty > 0
        const checkQty = await pool.query(
          `SELECT id FROM tbc_school_challan_books
       WHERE book_id = $1 AND udise_code = $2
         AND challan_id IN (
           SELECT id FROM tbc_school_challans WHERE udise_code = $2
         )
         AND remaining_qty > 0
       ORDER BY id ASC
       LIMIT 1`,
          [barcodeRow.book_id, udise_code]
        );

        if (!checkQty.rows.length) {
          return res.status(400).json({
            success: false,
            message: "Book quantity is zero, you can't scan more books"
          });
        }

        const selectedBookId = checkQty.rows[0].id;

        // Step 7: Insert scan tracking
        await pool.query(
          `INSERT INTO tbc_book_tracking 
         (isbn, unique_code, book_id, challan_id, school_id, udise_code, scanned_yn, scanned_at, scanned_by, subject_id)
       VALUES ($1, $2, $3, NULL, $4, $5, TRUE, CURRENT_TIMESTAMP, $4, $6)`,
          [
            final_isbn,
            barcode_value,
            barcodeRow.book_id,
            teacher_id,
            udise_code,
            barcodeRow.subject_id
          ]
        );

        // Step 8: Decrement quantity from the selected challan book row
        await pool.query(
          `UPDATE tbc_school_challan_books
       SET remaining_qty = remaining_qty - 1
       WHERE id = $1`,
          [selectedBookId]
        );
        results.push({ barcode_value, success: true, message: "Scanned successfully" });

      } catch (errInner) {
        results.push({ barcode_value, success: false, message: errInner.message });
      }
    }

    res.json({ success: true, results });

  } catch (err) {
    console.error("Bulk Scan Error:", err);
    res.status(500).json({ message: "Bulk scan failed", error: err.message });
  } finally {
    client.release();
  }
};


// const scanCode = async (req, res) => {
//   /* #swagger.tags = ['School Mobile Api'] */
//   /* #swagger.security = [{ "Bearer": [] }] */
//   try {
//     const teacher_id = 172;
//     const { isbn_code, barcode_value, udise_code } = req.body;

//     let final_isbn = isbn_code;
//     if (isbn_code === '9789333000857') {
//       final_isbn = '9789324000859'; 
//     } else if(isbn_code === '9789371000291'){
//       final_isbn = '9789379001566';
//     }else if(isbn_code === '9789333001571'){
//       final_isbn = '9789329001578';
//     }

//     // Step 1: Validate ISBN
//     const isbnRes = await pool.query(
//      `SELECT * FROM tbc_isbn_codes WHERE isbn_code = $1`,
//       [final_isbn]
//     );
//     if (!isbnRes.rows.length) {
//       return res.status(404).json({ message: "Invalid ISBN code" });
//     }

//     // Step 2: Decode barcode
//     const { order_id, book_id, class_id, publisher_id, full_code_number } = parseBarcode(barcode_value);    

//     let barcodeRes;

//     // Step 3: Try matching by book_id/class_id
//     const firstQuery = await pool.query(
//       `SELECT gb.*, ic.subject_id, ic.id AS isbn_id
//        FROM tbc_generated_barcodes gb
//        JOIN tbc_books ic ON ic.id = gb.book_id AND ic.isbn_code = $1
//        WHERE gb.book_id = $2 AND gb.class_level = $3
//        AND $4 BETWEEN gb.start_barcode AND gb.end_barcode`,
//       [final_isbn, book_id, class_id, full_code_number]
//     );

//     if (firstQuery.rows.length > 0) {
//       barcodeRes = firstQuery;
//     } else {
//       // Step 4: Try fallback by order_id/publisher_id
//       const secondQuery = await pool.query(
//         `SELECT gb.*, ic.subject_id, ic.id AS isbn_id
//          FROM tbc_generated_barcodes gb
//          JOIN tbc_books ic ON ic.id = gb.book_id AND ic.isbn_code = $1
//          WHERE gb.order_id = $2 AND gb.publisher_id = $3
//          AND $4 BETWEEN gb.start_barcode AND gb.end_barcode`,
//         [final_isbn, order_id, publisher_id, full_code_number]
//       );

//       if (secondQuery.rows.length > 0) {
//         barcodeRes = secondQuery;
//       } else {
//         return res.status(404).json({ success: false, message: "Barcode not found in the database." });
//       }
//     }

//     const barcodeRow = barcodeRes.rows[0];

//     // Step 5: Check if already scanned
//     const alreadyScanned = await pool.query(
//       `SELECT 1 FROM tbc_book_tracking WHERE unique_code = $1 AND isbn = $2`,
//       [barcode_value, final_isbn]
//     );
//     if (alreadyScanned.rows.length) {
//       return res.status(400).json({ success: false, message: "Barcode already scanned" });
//     }

//     // Step 6: Check if any challan row with qty > 0
//     const checkQty = await pool.query(
//       `SELECT id FROM tbc_school_challan_books
//        WHERE book_id = $1 AND udise_code = $2
//          AND challan_id IN (
//            SELECT id FROM tbc_school_challans WHERE udise_code = $2
//          )
//          AND remaining_qty > 0
//        ORDER BY id ASC
//        LIMIT 1`,
//       [barcodeRow.book_id, udise_code]
//     );

//     if (!checkQty.rows.length) {
//       return res.status(400).json({
//         success: false,
//         message: "Book quantity is zero, you can't scan more books"
//       });
//     }

//     const selectedBookId = checkQty.rows[0].id;

//     // Step 7: Insert scan tracking
//     await pool.query(
//       `INSERT INTO tbc_book_tracking 
//          (isbn, unique_code, book_id, challan_id, school_id, udise_code, scanned_yn, scanned_at, scanned_by, subject_id)
//        VALUES ($1, $2, $3, NULL, $4, $5, TRUE, CURRENT_TIMESTAMP, $4, $6)`,
//       [
//         final_isbn,
//         barcode_value,
//         barcodeRow.book_id,
//         teacher_id,
//         udise_code,
//         barcodeRow.subject_id
//       ]
//     );

//     // Step 8: Decrement quantity from the selected challan book row
//     await pool.query(
//       `UPDATE tbc_school_challan_books
//        SET remaining_qty = remaining_qty - 1
//        WHERE id = $1`,
//       [selectedBookId]
//     );

//     res.json({ success: true, message: "Book scan recorded successfully." });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error scanning book", error: err.message });
//   }
// };

const scanCode = async (req, res) => {
  /* #swagger.tags = ['School Mobile Api'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const teacher_id = req.user.user_id;
    const { isbn_code, barcode_value, udise_code } = req.body;

    if (!isbn_code || !barcode_value || !udise_code) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Step 1: Normalize special ISBNs (if needed)
    let final_isbn = isbn_code;
    // Step 2: Validate ISBN and fetch book_id, subject_id
    const isbnRes = await pool.query(
      `SELECT id AS book_id, subject_id FROM tbc_books WHERE isbn_code = $1`,
      [final_isbn]
    );
    if (!isbnRes.rows.length) {
      return res.status(404).json({ message: "Invalid ISBN code" });
    }

    const { book_id, subject_id } = isbnRes.rows[0];

    // Step 3: Decode the barcode
    const { full_code_number } = parseBarcode(barcode_value); // Assuming this function returns full_code_number, order_id, class_id, etc.

    // Step 4: Validate the barcode within generated range for that book
    const barcodeCheck = await pool.query(
      `SELECT 1
       FROM tbc_generated_barcodes
       WHERE book_id = $1 AND $2 BETWEEN start_barcode AND end_barcode`,
      [book_id, full_code_number]
    );

    if (!barcodeCheck.rows.length) {
      return res.status(404).json({ success: false, message: "Barcode does not belong to this ISBN/book." });
    }

    // Step 5: Check if barcode already scanned
    const alreadyScanned = await pool.query(
      `SELECT 1 FROM tbc_book_tracking WHERE unique_code = $1 AND isbn = $2`,
      [barcode_value, final_isbn]
    );

    if (alreadyScanned.rows.length) {
      return res.status(400).json({ success: false, message: "Barcode already scanned" });
    }

    // Step 6: Find the correct challan book entry with remaining_qty > 0
    const bookChallanRes = await pool.query(
      `SELECT id, challan_id
   FROM tbc_school_challan_books
   WHERE udise_code = $1
     AND subject_id = $2
     AND remaining_qty > 0
   ORDER BY id ASC
   LIMIT 1`,
      [udise_code, subject_id]
    );

    if (!bookChallanRes.rows.length) {
      return res.status(400).json({
        success: false,
        message: "Book quantity is zero, you can't scan more books"
      });
    }

    const { id: selectedBookId, challan_id } = bookChallanRes.rows[0];

    // Step 7: Insert into book tracking
    await pool.query(
      `INSERT INTO tbc_book_tracking 
         (isbn, unique_code, book_id, challan_id, school_id, udise_code, scanned_yn, scanned_at, scanned_by, subject_id)
       VALUES ($1, $2, $3, $4, NULL, $5, TRUE, CURRENT_TIMESTAMP, $6, $7)`,
      [
        final_isbn,
        barcode_value,
        book_id,
        challan_id,
        udise_code,
        teacher_id,
        subject_id
      ]
    );

    // Step 8: Decrease remaining_qty atomically
    const updateQty = await pool.query(
      `UPDATE tbc_school_challan_books
       SET remaining_qty = remaining_qty - 1
       WHERE id = $1 AND remaining_qty > 0`,
      [selectedBookId]
    );

    if (updateQty.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "No remaining quantity available for this book."
      });
    }

    res.json({ success: true, message: "Book scan recorded successfully." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error scanning book", error: err.message });
  }
};


function parseBarcode(barcode_value) {
  const barcodeStr = barcode_value.toString().padStart(13, '0');
  const series_number = barcodeStr.slice(-8);
  const rest = barcodeStr.slice(0, barcodeStr.length - 8);
  const full_code_number = parseInt(barcodeStr);

  let order_id = null;
  let book_id = null;
  let class_id = 0;
  let publisher_id = null;

  // Case 1: barcode starts with exactly 1 leading zero
  if (barcodeStr.length === 14) {
    order_id = parseInt(barcodeStr.slice(0, 3));
    publisher_id = parseInt(barcodeStr.slice(3, 6));
  }
  else if (/^0\d{2}/.test(barcodeStr)) {
    // console.log(IF part);
    book_id = parseInt(barcodeStr.slice(1, 3));
    order_id = parseInt(barcodeStr.slice(1, 3));
    class_id = parseInt(barcodeStr.slice(3, 5));
    publisher_id = parseInt(barcodeStr.slice(3, 6));
  }
  else {
    // console.log(ELSE part);
    order_id = parseInt(barcodeStr.slice(0, 2));
    publisher_id = parseInt(barcodeStr.slice(3, 5));
    class_id = 0;
  }


  return {
    order_id,
    book_id,
    class_id,
    publisher_id,
    series_number,
    full_code_number
  };
}


/// Scan Old Barcode Extracting ISBN and Book ID
function parseBarcodeOld(barcode_value) {
  const barcodeStr = barcode_value.toString().padStart(13, '0');
  const series_number = barcodeStr.slice(-8);
  const rest = barcodeStr.slice(0, barcodeStr.length - 8);
  const full_code_number = parseInt(barcodeStr);

  let order_id = null;
  let book_id = null;
  let class_id = 0;
  let publisher_id = null;

  // Case 1: barcode starts with exactly 1 leading zero
  if (barcodeStr.length === 14) {
    order_id = parseInt(barcodeStr.slice(0, 3));
    publisher_id = parseInt(barcodeStr.slice(3, 6));
  }
  else if (/^0\d{2}/.test(barcodeStr)) {
    // console.log(IF part);
    book_id = parseInt(barcodeStr.slice(1, 3));       // 2 digits for order
    order_id = parseInt(barcodeStr.slice(1, 3));       // 2 digits for order
    class_id = parseInt(barcodeStr.slice(3, 5));       // 2 digits for class
    publisher_id = parseInt(barcodeStr.slice(3, 6));      // 3 digits for publisher
  }
  else {
    // console.log(ELSE part);
    order_id = parseInt(barcodeStr.slice(0, 3));
    publisher_id = parseInt(barcodeStr.slice(3, 6));
    class_id = 0;
  }


  return {
    order_id,
    book_id,
    class_id,
    publisher_id,
    series_number,
    full_code_number
  };
}

/// Scan Old Books Codes


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
    // const barcodeStr = barcode_value.toString();
    // const series_number = barcodeStr.slice(-8);
    // const rest = barcodeStr.slice(0, barcodeStr.length - 8);
    // const publisher_id = parseInt(rest.slice(-3));
    // const order_id = parseInt(rest.slice(0, rest.length - 3));
    // const full_code_number = parseInt(barcodeStr);

    const { order_id, book_id, class_id, publisher_id, full_code_number } = parseBarcode(barcode_value);
    let barcodeRes;

    const firstQuery = await pool.query(
      `SELECT gb.* FROM tbc_generated_barcodes AS gb WHERE gb.book_id = $1 AND gb.class_level = $2 AND $3 BETWEEN gb.start_barcode AND gb.end_barcode`,
      [book_id, class_id, full_code_number]
    );

    if (firstQuery.rows.length > 0) {
      barcodeRes = firstQuery;
    } else {
      const secondQuery = await pool.query(
        `SELECT gb.* FROM tbc_generated_barcodes AS gb WHERE gb.order_id = $1 AND gb.publisher_id = $2 AND $3 BETWEEN gb.start_barcode AND gb.end_barcode`,
        [order_id, publisher_id, full_code_number]
      );

      if (secondQuery.rows.length > 0) {
        barcodeRes = secondQuery;
      } else {
        console.error(`Barcode not found using book_id/class_id or order_id/publisher_id`);
        throw new Error('Barcode not found in the database.');
      }
    }

    // // Validate barcode
    // const barcodeRes = await pool.query(
    //   `SELECT gb.* FROM tbc_generated_barcodes AS gb WHERE gb.order_id = $1 AND gb.publisher_id = $2 AND $3 BETWEEN gb.start_barcode AND gb.end_barcode`,
    //   [order_id, publisher_id, full_code_number]
    // );
    if (!barcodeRes.rows.length) {
      return res.status(404).json({ message: "Invalid barcode" });
    }
    const checkBarCodeScanned = await pool.query('SELECT * FROM tbc_book_tracking WHERE unique_code = $1', [barcode_value]);
    if (!checkBarCodeScanned.rows.length) {
      return res.status(400).json({ message: "This Code Does Not Scanned Yet By Anyone" });
    }

    // Check if already scanned
    const scannedCode = await pool.query(
      `SELECT tbt.id,ms.udise_sch_code, ms.school_name,ms.district_name,ms.block_name,ms.cluster_name,mt.name_eng as scanned_by,mt.designation_id as designation FROM tbc_book_tracking as tbt
      LEFT JOIN mst_schools as ms ON ms.udise_sch_code = tbt.udise_code
      LEFT JOIN mst_users as mu ON mu.user_id = tbt.scanned_by
      LEFT JOIN mst_teacher as  mt ON mt.teacher_code = mu.column_value 
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


const getTbcBookdata = async (req, res) => {
  try {
    const { udise_code } = req.body;

    if (!udise_code) {
      return res.status(400).json({ message: "UDISE code is required" });
    }

    const tbc_school_books = await pool.query(
      `SELECT * FROM tbc_school_challan_books WHERE udise_code = $1`, [udise_code]
    );

    const subjects = await pool.query(
      `SELECT * FROM mst_subjects`,
    );

    const tbcBooks = await pool.query(
      `SELECT * FROM tbc_books`,
    );

    const tbcISBN = await pool.query(
      `SELECT * FROM tbc_isbn_codes`,
    );

    const tbcBarcodes = await pool.query(
      `SELECT * FROM tbc_generated_barcodes`,
    );


    if (tbcBooks.rows.length === 0 && subjects.rows.length && tbc_school_books.rows.length === 0 && tbcISBN.rows.length === 0 && tbcBarcodes.rows.length === 0) {
      return res.status(404).json({ message: "No books found for this school" });
    }


    res.json({ success: true, subjects: subjects.rows, schools: tbc_school_books.rows, books: tbcBooks.rows, isbn: tbcISBN.rows, barcodes: tbcBarcodes.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching book data", error: error.message });
  }
};


module.exports = {
  booksStdCount,
  getSubjectWiseStd,
  scanCode,
  bookRecieveMulti,
  bookRecieveSingle,
  scanBarCode,
  getSubjectWiseStd2,
  subjectWiseStdOff,
  SubjectWiseStdOff2,
  getTbcBookdata,
  scanCodesBulk,
};
