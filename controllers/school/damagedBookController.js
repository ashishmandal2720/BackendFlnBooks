const { pool } = require('../../config/db');
const responseHandler = require('../../utils/responseHandler');

const createDamageReport = async (req, res) => {
  /* #swagger.tags = ['School Mobile Api'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const user_id = req.user.user_id;
    const { book_id, udise_code, damaged_qty, reason } = req.body;

    if (!book_id) {
      return responseHandler(res, 400, 'Missing required field: Book ID');
    }
    if (!udise_code) {
      return responseHandler(res, 400, 'Missing required field: UDISE Code');
    }
    if (!damaged_qty) {
      return responseHandler(res, 400, 'Missing required field: Damaged Quantity');
    }

    const assignedRes = await pool.query(
      `SELECT COALESCE(SUM(quantity),0) AS qty
       FROM tbc_school_challan_books
       WHERE book_id = $1 AND udise_code = $2`,
      [book_id, udise_code]
    );
    const assignedQty = parseInt(assignedRes.rows[0].qty, 10) || 0;

    const currentRes = await pool.query(
      `SELECT COALESCE(SUM(damaged_qty),0) AS qty
       FROM tbc_damaged_books
       WHERE book_id = $1 AND udise_code = $2 AND user_id != $3`,
      [book_id, udise_code, user_id]
    );
    const currentQty = parseInt(currentRes.rows[0].qty, 10) || 0;

    if (parseInt(damaged_qty, 10) < 0) {
      return responseHandler(res, 400, 'Damage book quantity can not be negative');
    }

    if (currentQty + parseInt(damaged_qty, 10) > assignedQty) {
      return responseHandler(res, 400, 'Damage book quantity can not be Higher than total quantity');
    }

    await pool.query(
      `INSERT INTO tbc_damaged_books (book_id, udise_code, user_id, damaged_qty, reason)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (book_id, udise_code, user_id) DO UPDATE
       SET damaged_qty = EXCLUDED.damaged_qty, reason = EXCLUDED.reason, updated_at = CURRENT_TIMESTAMP`,
      [book_id, udise_code, user_id, damaged_qty, reason]
    );

    responseHandler(res, 200, 'Damage report saved');
  } catch (error) {
    console.error('Error saving damage report:', error);
    responseHandler(res, 500, 'Error saving damage report', null, error.message);
  }
};

const createDamageReportBulk = async (req, res) => {
  /* #swagger.tags = ['School Mobile Api'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const user_id = req.user.user_id;
    const { reports } = req.body;

    if (!Array.isArray(reports) || !reports.length) {
      return responseHandler(res, 400, 'Reports array is required');
    }

    const insertPromises = [];
    for (const rep of reports) {
      const { book_id, udise_code, damaged_qty, reason } = rep;
      if (!book_id || !udise_code || !damaged_qty) {
        return responseHandler(res, 400, 'Missing fields in one of the reports');
      }

      const assignedRes = await pool.query(
        `SELECT COALESCE(SUM(quantity),0) AS qty
         FROM tbc_school_challan_books
         WHERE book_id = $1 AND udise_code = $2`,
        [book_id, udise_code]
      );
      const assignedQty = parseInt(assignedRes.rows[0].qty, 10) || 0;

      const currentRes = await pool.query(
        `SELECT COALESCE(SUM(damaged_qty),0) AS qty
         FROM tbc_damaged_books
         WHERE book_id = $1 AND udise_code = $2 AND user_id != $3`,
        [book_id, udise_code, user_id]
      );
      const currentQty = parseInt(currentRes.rows[0].qty, 10) || 0;

      if (currentQty + parseInt(damaged_qty, 10) > assignedQty) {
        return responseHandler(res, 400, 'Damage book quantity can not be Higher than total quantity');
      }
      insertPromises.push(
        pool.query(
          `INSERT INTO tbc_damaged_books (book_id, udise_code, user_id, damaged_qty, reason)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (book_id, udise_code, user_id) DO UPDATE
           SET damaged_qty = EXCLUDED.damaged_qty, reason = EXCLUDED.reason, updated_at = CURRENT_TIMESTAMP`,
          [book_id, udise_code, user_id, damaged_qty, reason]
        )
      );
    }

    await Promise.all(insertPromises);

    responseHandler(res, 200, 'Damage reports saved');
  } catch (error) {
    responseHandler(res, 500, 'Error saving damage reports', null, error.message);
  }
};

const mergeDuplicateDamagedBooks = async (udise, bookId) => {
  const params = [];
  let where = '';
  if (udise) {
    params.push(udise);
    where += `udise_code = $${params.length}`;
  }
  if (bookId) {
    if (where) where += ' AND ';
    params.push(bookId);
    where += `book_id = $${params.length}`;
  }

  const dupQuery = `
    SELECT udise_code, book_id, MIN(id) AS keep_id,
           SUM(damaged_qty) AS total_qty
    FROM tbc_damaged_books
    ${where ? 'WHERE ' + where : ''}
    GROUP BY udise_code, book_id
    HAVING COUNT(*) > 1`;

  const { rows } = await pool.query(dupQuery, params);

  for (const row of rows) {
    const scanRes = await pool.query(
      `SELECT COUNT(*) FROM tbc_book_tracking
       WHERE udise_code = $1 AND book_id = $2 AND scanned_yn = TRUE`,
      [row.udise_code, row.book_id]
    );
    let scanCount = parseInt(scanRes.rows[0].count, 10) || 0;
    if (scanCount > row.total_qty) scanCount = row.total_qty;

    await pool.query(
      `UPDATE tbc_damaged_books
         SET damaged_qty = $1, scan_count = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [row.total_qty, scanCount, row.keep_id]
    );

    await pool.query(
      `DELETE FROM tbc_damaged_books
       WHERE udise_code = $1 AND book_id = $2 AND id <> $3`,
      [row.udise_code, row.book_id, row.keep_id]
    );
  }
};

const scanDamagedBook = async (req, res) => {
  /* #swagger.tags = ['School Mobile Api'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const user_id = req.user.user_id;
    const { isbn_code, udise_code } = req.body;

    const final_isbn = isbn_code;

    const book_list = await pool.query(
      'SELECT id FROM tbc_books WHERE isbn_code = $1',
      [final_isbn]
    );
    const book_id = book_list.rows[0]?.id;
    const udise_code_new = udise_code.substring(0, 11);

    if (!final_isbn) {
      return responseHandler(res, 400, 'Invalid ISBN code');
    }
    if (!udise_code_new) {
      return responseHandler(res, 400, 'Invalid UDISE code');
    }

    const unique_code = (udise_code + "-" + book_id).trim();

    let recordRes = await pool.query(
      `SELECT * FROM tbc_damaged_books WHERE book_id = $1 AND udise_code = $2`,
      [book_id, udise_code_new]
    );
    if (!recordRes.rows.length) {
      return responseHandler(res, 404, 'Damage record not found');
    }

    if (recordRes.rows.length > 1) {
      await mergeDuplicateDamagedBooks(udise_code_new, book_id);
      recordRes = await pool.query(
        `SELECT * FROM tbc_damaged_books WHERE book_id = $1 AND udise_code = $2`,
        [book_id, udise_code_new]
      );
    }

    const record = recordRes.rows[0];
    if (record.scan_count >= record.damaged_qty) {
      return responseHandler(res, 400, 'All damaged books already scanned');
    }

    const scannedBookRes = await pool.query(
      `SELECT * FROM tbc_book_tracking where isbn = $1 AND unique_code = $2 AND udise_code=$3 AND scanned_yn = TRUE`,
      [final_isbn, unique_code, udise_code_new]);
    if (scannedBookRes.rows.length) {
      return responseHandler(res, 400, 'Book already scanned');
    }

    const challanRes = await pool.query(
      `SELECT id FROM tbc_school_challan_books
       WHERE book_id = $1
       AND udise_code = $2
       AND remaining_qty > 0
       ORDER BY id LIMIT 1`,
      [book_id, udise_code_new]
    );

    if (!challanRes.rows.length) {
      return responseHandler(res, 400, 'Book quantity is zero, cannot scan');
    }

    const challanBookId = challanRes.rows[0].id;

    const newCount = record.scan_count + 1;
    await pool.query(
      `UPDATE tbc_damaged_books
       SET scan_count = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newCount, record.id]
    );

    await pool.query(
      `UPDATE tbc_school_challan_books
       SET remaining_qty = remaining_qty - 1
       WHERE id = $1`,
      [challanBookId]
    );

    const subjectRes = await pool.query(
      'SELECT subject_id FROM tbc_books WHERE id = $1',
      [book_id]
    );
    const subject_id = subjectRes.rows[0]?.subject_id || null;

    await pool.query(
      `INSERT INTO tbc_book_tracking
         (isbn, unique_code, book_id, challan_id, school_id, udise_code, scanned_yn, scanned_at, scanned_by, subject_id)
       VALUES ($1, $2, $3, NULL, $4, $5, TRUE, CURRENT_TIMESTAMP, $4, $6)`,
      [final_isbn, unique_code, book_id, user_id, udise_code_new, subject_id]
    );

    responseHandler(res, 200, 'Book scan recorded', { unique_code: unique_code });
  } catch (error) {
    console.error('Error scanning damaged book:', error);
    responseHandler(res, 500, 'Error scanning damaged book', null, error.message);
  }
};

const getSubjectWiseStd2Damage = async (req, res) => {
  /* #swagger.tags = ['School Mobile Api'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const { udise_code, class_level } = req.body;

    const result = await pool.query(
      `
      WITH subject_list AS (
        SELECT id AS subject_id, name AS subject_name, class_level::int AS class
        FROM mst_subjects
        WHERE class_level::int = $1
          AND medium IN (1,2)
      ),

      challan_cte AS (
        SELECT b.subject_id, scb.distributed_qty, scb.received_qty, scb.quantity,
               scb.received_status, scb.remaining_qty,
               scb.id AS book_id, scb.book_id as b_id
        FROM tbc_school_challan_books scb
        JOIN tbc_books b ON b.id = scb.book_id
        WHERE scb.udise_code = $2
      ),

      aggregated_challan AS (
        SELECT subject_id,
               SUM(distributed_qty::int) AS total_distributed_qty,
               SUM(received_qty) AS total_received_qty,
               SUM(quantity) AS total_quantity,
               SUM(remaining_qty) AS total_remaining_quantity,
               BOOL_AND(received_status) AS received_status,
               MIN(book_id) AS book_id,
               MIN(b_id) AS b_id
        FROM challan_cte
        GROUP BY subject_id
      ),

      damage_cte AS (
        SELECT b.subject_id,
               SUM(d.damaged_qty) AS damaged_qty,
               SUM(d.scan_count) AS scan_count,
               STRING_AGG(d.reason, '; ') AS reason
        FROM tbc_damaged_books d
        JOIN tbc_books b ON b.id = d.book_id
        WHERE d.udise_code = $2
        GROUP BY b.subject_id
      )

      SELECT ROW_NUMBER() OVER (ORDER BY sl.subject_id) AS sn,
             sl.subject_name,
             sl.subject_id,
             sl.class,
             COALESCE(dc.scan_count, 0) AS scan_count,
             ac.total_distributed_qty AS distributed_qty,
             ac.total_received_qty AS received_qty,
             ac.total_remaining_quantity AS remaining_qty,
             ac.total_quantity AS quantity,
             ac.received_status AS received_status,
             ac.book_id,
             ac.b_id,
             COALESCE(dc.damaged_qty, 0) AS damaged_qty,
             dc.reason
      FROM subject_list sl
      INNER JOIN aggregated_challan ac ON ac.subject_id = sl.subject_id
      LEFT JOIN damage_cte dc ON dc.subject_id = sl.subject_id
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

    res.json({
      success: true,
      udise_code,
      class_level,
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

module.exports = { createDamageReport, scanDamagedBook, createDamageReportBulk, getSubjectWiseStd2Damage };
