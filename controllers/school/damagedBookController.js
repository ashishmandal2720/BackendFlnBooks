const { pool } = require('../../config/db');
const responseHandler = require('../../utils/responseHandler');

const saveOrUpdateDamageReports = async (req, res, isUpdate = false) => {
  /* #swagger.tags = ['School Mobile Api'] */
  /* #swagger.security = [{ "Bearer": [] }] */
  try {
    const user_id = req.user?.user_id;
    if (!user_id) {
      return responseHandler(res, 401, 'Unauthorized: User not found in session');
    }

    let reportList = [];
    if (Array.isArray(req.body)) {
      reportList = req.body;
    } else if (Array.isArray(req.body?.reports)) {
      reportList = req.body.reports;
    } else if (Array.isArray(req.body?.books)) {
      reportList = req.body.books;
    } else if (req.body && typeof req.body === 'object') {
      reportList = [req.body];
    }

    if (!reportList || reportList.length === 0) {
      return responseHandler(res, 400, 'Damage report data is required');
    }

    // Determine default udise_code
    let defaultUdise =
      req.body?.udise_code ??
      req.body?.udisecode ??
      req.body?.udise ??
      req.query?.udise_code ??
      req.query?.udisecode ??
      req.query?.udise;

    if (!defaultUdise && reportList.length > 0) {
      defaultUdise = reportList[0]?.udise_code ?? reportList[0]?.udisecode ?? reportList[0]?.udise;
    }

    if (!defaultUdise && user_id) {
      const userRes = await pool.query(
        'SELECT column_value FROM mst_users WHERE user_id = $1',
        [user_id]
      );
      if (userRes.rows.length && userRes.rows[0].column_value) {
        const colVal = String(userRes.rows[0].column_value).trim();
        if (colVal.length === 11 && /^\d+$/.test(colVal)) {
          defaultUdise = colVal;
        } else {
          const tchRes = await pool.query(
            'SELECT current_udise_id, udise_id FROM mst_teacher WHERE teacher_code = $1 LIMIT 1',
            [colVal]
          );
          if (tchRes.rows.length) {
            defaultUdise = tchRes.rows[0].current_udise_id || tchRes.rows[0].udise_id;
          }
        }
      }
    }

    for (const item of reportList) {
      // Resolve book ID (supports b_id, book_id, id, and challan book id)
      let rawBookId =
        item.b_id != null
          ? item.b_id
          : item.book_id != null
          ? item.book_id
          : item.id != null
          ? item.id
          : req.params?.book_id || req.params?.id;

      let finalBookId = rawBookId != null ? parseInt(rawBookId, 10) : null;

      if (finalBookId) {
        const bookCheck = await pool.query('SELECT id FROM tbc_books WHERE id = $1', [finalBookId]);
        if (bookCheck.rows.length === 0) {
          // Check if rawBookId is a challan book ID (tbc_school_challan_books.id)
          const challanCheck = await pool.query(
            'SELECT book_id FROM tbc_school_challan_books WHERE id = $1',
            [finalBookId]
          );
          if (challanCheck.rows.length > 0) {
            finalBookId = challanCheck.rows[0].book_id;
          } else if (item.subject_id) {
            const subjCheck = await pool.query(
              'SELECT id FROM tbc_books WHERE subject_id = $1 LIMIT 1',
              [item.subject_id]
            );
            if (subjCheck.rows.length > 0) {
              finalBookId = subjCheck.rows[0].id;
            }
          }
        }
      } else if (item.subject_id) {
        const subjCheck = await pool.query(
          'SELECT id FROM tbc_books WHERE subject_id = $1 LIMIT 1',
          [item.subject_id]
        );
        if (subjCheck.rows.length > 0) {
          finalBookId = subjCheck.rows[0].id;
        }
      }

      if (!finalBookId) {
        return responseHandler(res, 400, 'Missing required field: Book ID');
      }

      // Resolve UDISE code
      const udiseCode = String(
        item.udise_code || item.udisecode || item.udise || defaultUdise || ''
      ).trim();

      if (!udiseCode) {
        return responseHandler(res, 400, 'Missing required field: UDISE Code');
      }

      // Check damaged_qty
      const rawQty = item.damaged_qty ?? item.qty ?? item.count;
      if (rawQty === undefined || rawQty === null || rawQty === '') {
        return responseHandler(res, 400, 'Missing required field: Damaged Quantity');
      }

      const damagedQty = parseInt(rawQty, 10);
      if (isNaN(damagedQty) || damagedQty < 0) {
        return responseHandler(res, 400, 'Damage book quantity can not be negative');
      }

      // Check existing scan count
      const existingRes = await pool.query(
        `SELECT id, scan_count, damaged_qty, user_id, reason
         FROM tbc_damaged_books
         WHERE book_id = $1 AND udise_code = $2`,
        [finalBookId, udiseCode]
      );
      const totalScanCount = existingRes.rows.reduce(
        (sum, r) => sum + (parseInt(r.scan_count, 10) || 0),
        0
      );

      if (damagedQty < totalScanCount) {
        return responseHandler(
          res,
          400,
          `Damaged quantity cannot be lower than scanned quantity (${totalScanCount})`
        );
      }

      // Check assigned and received quantities
      const assignedRes = await pool.query(
        `SELECT COALESCE(SUM(quantity), 0) AS qty,
                COALESCE(SUM(received_qty), 0) AS rcv_qty
         FROM tbc_school_challan_books
         WHERE book_id = $1 AND udise_code = $2`,
        [finalBookId, udiseCode]
      );
      const assignedQty = parseInt(assignedRes.rows[0]?.qty, 10) || 0;
      const receivedQty = parseInt(assignedRes.rows[0]?.rcv_qty, 10) || 0;
      const maxAllowedQty = Math.max(assignedQty, receivedQty);

      const otherRes = await pool.query(
        `SELECT COALESCE(SUM(damaged_qty), 0) AS qty
         FROM tbc_damaged_books
         WHERE book_id = $1 AND udise_code = $2 AND user_id != $3`,
        [finalBookId, udiseCode, user_id]
      );
      const otherQty = parseInt(otherRes.rows[0]?.qty, 10) || 0;

      if (maxAllowedQty > 0 && otherQty + damagedQty > maxAllowedQty) {
        return responseHandler(res, 400, 'Damage book quantity can not be Higher than total quantity');
      }

      const userRow = existingRes.rows.find((r) => r.user_id === user_id);
      const reason =
        item.reason !== undefined && item.reason !== null
          ? item.reason
          : userRow?.reason || null;

      await pool.query(
        `INSERT INTO tbc_damaged_books (book_id, udise_code, user_id, damaged_qty, reason)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (book_id, udise_code, user_id) DO UPDATE
         SET damaged_qty = EXCLUDED.damaged_qty,
             reason = COALESCE(EXCLUDED.reason, tbc_damaged_books.reason),
             updated_at = CURRENT_TIMESTAMP`,
        [finalBookId, udiseCode, user_id, damagedQty, reason]
      );

      if (existingRes.rows.length > 1) {
        await mergeDuplicateDamagedBooks(udiseCode, finalBookId);
      }
    }

    const successMessage = isUpdate ? 'Damage report updated successfully' : 'Damage report saved';
    return responseHandler(res, 200, successMessage);
  } catch (error) {
    console.error('Error in saveOrUpdateDamageReports:', error);
    return responseHandler(res, 500, 'Error saving damage report', null, error.message);
  }
};

const createDamageReport = async (req, res) => {
  return saveOrUpdateDamageReports(req, res, false);
};

const editDamageReport = async (req, res) => {
  return saveOrUpdateDamageReports(req, res, true);
};

const createDamageReportBulk = async (req, res) => {
  return saveOrUpdateDamageReports(req, res, false);
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

module.exports = {
  createDamageReport,
  editDamageReport,
  scanDamagedBook,
  createDamageReportBulk,
  getSubjectWiseStd2Damage
};
