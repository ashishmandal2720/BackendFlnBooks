const { pool } = require("../../config/db");

const crypto = require("crypto");

function generateUniqueNumber(userId) {
  const year = new Date().getFullYear().toString().slice(-4);
  const timestamp = Date.now(); // Current timestamp in milliseconds
  const randomPart = Math.floor(Math.random() * 100000); // Random 5-digit number
  const hash = crypto
    .createHash("md5")
    .update(`${userId}-${timestamp}-${randomPart}`)
    .digest("hex"); // Generate hash
  const uniqueNumber = parseInt(hash.substring(0, 10), 16); // Convert part of the hash to a number
  return year + uniqueNumber.toString().slice(0, 6); // Return 10-digit unique number
}
// Assign Book to Publisher
const assignBook = async (req, res) => {
  /* #swagger.tags = ['Assign Books'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { book_id, publisher_id, quantity,content_rcv_yn } = req.body;

    const book_number = parseInt(book_id); // Ensure book_id is an integer
    const publisher_number = parseInt(publisher_id); // Ensure publisher_id is an integer
    // Check if book exists
    const bookCheck = await pool.query(
      "SELECT tb.*, ms.class_level, ms.name as subject_name FROM tbc_books as tb LEFT JOIN mst_subjects as ms on tb.subject_id=ms.id  WHERE tb.id = $1",
      [book_number]
    );
    if (bookCheck.rows.length === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Check if publisher exists
    const publisherCheck = await pool.query(
      "SELECT * FROM mst_users WHERE user_id = $1 AND role_id = 2",
      [publisher_number]
    );
    if (publisherCheck.rows.length === 0) {
      return res.status(404).json({ message: "Publisher not found" });
    }

    // const duplicateCheck = await pool.query(
    //   "SELECT * FROM tbc_book_assignments WHERE book_id = $1 AND publisher_id = $2",
    //   [book_number, publisher_number]
    // );
    // if (duplicateCheck.rows.length > 0) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "This book is already assigned to this publisher.",
    //   });
    // }
    let unique_identifier = generateUniqueNumber(publisher_number); // Generate unique identifier

    await pool.query(
        "UPDATE tbc_books SET content_rcv_yn = $1 WHERE id = $2 RETURNING *",
        [content_rcv_yn, book_number]
    );

    // Assign book to publisher
    const assignment = await pool.query(
      "INSERT INTO tbc_book_assignments (book_id, publisher_id,unique_identifier, quantity,remaining_qty) VALUES ($1, $2, $3,$4,$4) RETURNING *",
      [book_number, publisher_number, unique_identifier, quantity]
    );
    await pool.query(
      "INSERT INTO tbc_notifications (user_id, message) VALUES ($1, $2)",
      [
        publisher_number,
        `A new book (Subject:${bookCheck.rows[0].subject_name} class:${bookCheck.rows[0].class_level} ID: ${book_number}) has been assigned to you.`,
      ]
    );

    res
      .status(201)
      .json({
        message: "Book assigned successfully",
        assignment: assignment.rows[0],
      });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update Assigned Book Quantity
const updateBookAssignmentQuantity = async (req, res) => {
  /* #swagger.tags = ['Assign Books'] */
  /* #swagger.security = [{"Bearer": []}] */ 
  try {
    const { assignment_id, new_quantity } = req.body;

    if (!assignment_id || !new_quantity) {
      return res.status(400).json({ message: "assignment_id and new_quantity are required." });
    }

    const assignmentNumber = parseInt(assignment_id);
    const quantityNumber = parseInt(new_quantity);

    if (isNaN(assignmentNumber) || isNaN(quantityNumber)) {
      return res.status(400).json({ message: "assignment_id and new_quantity must be numbers." });
    }

    // Fetch the assignment record
    const assignmentCheck = await pool.query(
      "SELECT * FROM tbc_book_assignments WHERE id = $1",
      [assignmentNumber]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    const oldAssignment = assignmentCheck.rows[0];

    // Check if already verified
    if (oldAssignment.verify === true) {
      return res.status(403).json({
        message: "Cannot update quantity. This assignment is already verified."
      });
    }

    // Calculate new remaining quantity
    const quantityDiff = quantityNumber - oldAssignment.quantity;
    const newRemainingQty = oldAssignment.remaining_qty + quantityDiff;

    if (newRemainingQty < 0) {
      return res.status(400).json({ message: "Remaining quantity cannot be negative." });
    }

    // Update the assignment
    const updatedAssignment = await pool.query(
      `UPDATE tbc_book_assignments
       SET quantity = $1, remaining_qty = $2
       WHERE id = $3
       RETURNING *`,
      [quantityNumber, newRemainingQty, assignmentNumber]
    );

    res.status(200).json({
      message: "Assignment quantity updated successfully.",
      updated_assignment: updatedAssignment.rows[0],
    });

  } catch (error) {
    console.error("Error updating assignment quantity:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get All Assigned Books (Admin View)
const getAllAssignments = async (req, res) => {
  /* #swagger.tags = ['Assign Books'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const result = await pool.query(
      `SELECT ba.id, b.isbn_code, b.class_level,b.content_rcv_yn,b.content_pub_rcv, u.name AS publisher_name, ba.quantity,ba.remaining_qty as remaining, ba.assigned_date ,s.name as subject_name,s.class_level ,m.medium_name ,ba.verify
       FROM tbc_book_assignments ba
       JOIN tbc_books b ON ba.book_id = b.id
       JOIN mst_users u ON ba.publisher_id = u.user_id
       JOIN mst_subjects s ON b.subject_id = s.id
       JOIN mst_medium m ON s.medium::int = m.medium_cd
       ORDER BY ba.assigned_date DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get Assigned Books for a Publisher
const getAssignmentsByPublisher = async (req, res) => {
  /* #swagger.tags = ['Assign Books'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { publisher_id } = req.params;
    const publisher_number = parseInt(publisher_id); 

    const result = await pool.query(
      `SELECT ba.id, b.isbn_code, b.class_level, b.front_cover_url, b.back_cover_url, b.content_rcv_yn,b.content_pub_rcv, ba.quantity,ba.remaining_qty as remaining, ba.assigned_date
       FROM tbc_book_assignments ba
       JOIN tbc_books b ON ba.book_id = b.id
       WHERE ba.publisher_id = $1
       ORDER BY ba.assigned_date DESC`,
      [publisher_number]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const publisherVerifyOrder = async (req, res) => {
    /* #swagger.tags = ['Assign Books'] */
  /* #swagger.security = [{"Bearer": []}] */
  const {id, verify } = req.body;
  const id_number = parseInt(id)
  if (typeof verify !== 'boolean') {
    return res.status(400).json({ success: false, message: "'verify' must be a boolean." });
  }

  try {
    const result = await pool.query(
      `UPDATE tbc_book_assignments SET verify = $1 WHERE id = $2 RETURNING *`,
      [verify, id_number]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Assignment not found." });
    }

    res.status(200).json({
      success: true,
      message: 'Verification status updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating verification status:', error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


module.exports = { assignBook, getAllAssignments, getAssignmentsByPublisher,publisherVerifyOrder,updateBookAssignmentQuantity };
