const { pool } = require("../../config/db");

const getPublisherChallan = async (req, res) => {
  /* #swagger.tags = ['Publisher Challan for Depot'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    // const { pub_id } = req.params;
    const publisher_id = req.user.user_id;

    const result = await pool.query(
      `SELECT * FROM tbc_depot_challans WHERE publisher_id=$1`,
      [publisher_id]
    );

    res.json({ message: "Challan Fetched successfully", challan: result.rows });
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Publisher Challan Fetching Failed",
        error: error.message,
      });
  }
};

const getSingleChallan = async (req, res) => {
  /* #swagger.tags = ['Publisher Challan for Depot'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { challan_id } = req.params;
    const challanId = parseInt(challan_id); // Ensure challan_id is an integer

    const result = await pool.query(
      `SELECT * FROM tbc_depot_challans WHERE id=$1`,
      [challanId]
    );

    res.json({
      message: "Publisher Challan Fetched successfully",
      challan: result.rows[0],
    });
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Publisher Data fetching failed",
        error: error.message,
      });
  }
};

const assignBooksToChallan = async (req, res) => {
  /* #swagger.tags = ['Publisher Challan for Depot'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { challan_date, depot_id, books } = req.body;
    const depotId = parseInt(depot_id); // Ensure depot_id is an integer
    // books = [{ book_id, sets, books_per_set, book_weight }]
    const publisher_id = req.user.user_id;

    const user = await pool.query(
      `SELECT * FROM mst_users WHERE user_id = $1`,
      [publisher_id]
    );
      let total_weight = 0;
      await pool.query("BEGIN");

      // Create Challan
      const result = await pool.query(
        `INSERT INTO tbc_depot_challans (challan_date, publisher_id, depot_id, dispatch_status)
             VALUES ($1, $2, $3, false) RETURNING *`,
        [challan_date, publisher_id, depotId]
      );

      const challan_id = result.rows[0].id;

      for (let book of books) {
        const { book_id, sets, books_per_set, book_weight } = book;
        const assigned_quantity = sets * books_per_set;

        // Check if assigned quantity is within available quantity
        const bookCheck = await pool.query(
          `SELECT remaining_qty FROM tbc_book_assignments WHERE book_id = $1 AND publisher_id = $2`,
          [book_id, publisher_id]
        );

        if (bookCheck.rows.length === 0) {
          await pool.query("ROLLBACK");
          return res
            .status(400)
            .json({
              message: `Book with ID ${book_id} not found in assignments`,
              error: `Book with ID ${book_id} not found in assignments`,
            });
        }

        const available_quantity = bookCheck.rows[0].remaining_qty;

        if (assigned_quantity > available_quantity) {
          await pool.query("ROLLBACK");
          return res.status(400).json({
            message: `Assigned quantity (${assigned_quantity}) for book ID ${book_id} exceeds available quantity (${available_quantity})`,
            error: `Exceeds available quantity (${available_quantity})`,
          });
        }

        const bundle_weight = books_per_set * book_weight;
        total_weight += bundle_weight * sets;
        const available_qty = sets * books_per_set;

        await pool.query(
          `INSERT INTO tbc_depot_challan_books (challan_id, book_id, sets, books_per_set, book_weight, bundle_weight,remaining_qty)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            challan_id,
            book_id,
            sets,
            books_per_set,
            book_weight,
            bundle_weight,
            available_qty,
          ]
        );

        await pool.query(
          `UPDATE tbc_book_assignments SET remaining_qty = remaining_qty - $1 WHERE book_id = $2 AND publisher_id = $3`,
          [assigned_quantity, book_id, publisher_id]
        );
      }

      await pool.query(
        `UPDATE tbc_depot_challans SET total_weight = $1 WHERE id = $2`,
        [total_weight, challan_id]
      );

      await pool.query("COMMIT");
      res.json({
        message: "Books assigned to challan successfully",
        total_weight,
      });
     
  } catch (error) {
    await pool.query("ROLLBACK");
    res
      .status(400)
      .json({
        error: error.message,
        message: "Error assigning books to challan",
      });
  }
};

const updateDispatchStatus = async (req, res) => {
  /* #swagger.tags = ['Publisher Challan for Depot'] */
  /* #swagger.security = [{"Bearer": []}] */

  try {
    const { challan_id } = req.body;
    const challanId = parseInt(challan_id); // Ensure challan_id is an integer
    await pool.query(
      `UPDATE tbc_depot_challans SET dispatch_status = true WHERE id = $1`,
      [challanId]
    );

    const challan = await pool.query(
      `SELECT * FROM tbc_depot_challans WHERE id = $1`,
      [challanId]
    );

    // Send notifications to Admin & Depot
    await pool.query(
      `INSERT INTO tbc_notifications (user_id, message)
         VALUES 
         ((SELECT user_id FROM mst_users WHERE role = 1), 'Challan dispatched: ' || $1),
         ($2, 'Challan dispatched to your depot: ' || $1)`,
      [challan.rows[0].challan_number, challan.rows[0].depot_id]
    );

    res.json({ message: "Dispatch status updated and notifications sent" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Something Went Wrong", error: error.message });
  }
};

const getChallanWithDetails = async (req, res) => {
  /* #swagger.tags = ['Publisher Challan for Depot'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { challan_id } = req.params;
    const challanId = parseInt(challan_id); // Ensure challan_id is an integer
    const result = await pool.query(
      `SELECT 
                c.id AS challan_id, 
                c.challan_number, 
                c.challan_date, 
                c.total_weight, 
                c.dispatch_status, 
                p.name AS publisher_name,
                p.address as publisher_address, 
                p.contact_number as publisher_contact, 
                p.email as publisher_email, 
                d.name AS depot_name, 
                d.address as depot_address, 
                d.contact_number as depot_contact, 
                d.email as depot_email, 
                b.book_id, 
                b.sets, 
                b.books_per_set, 
                b.book_weight,
                b.remaining_qty, 
                sb.name,
                sb.medium, 
                sb.class_level,
                m.medium_name
            FROM tbc_depot_challans c
            JOIN mst_users p ON c.publisher_id = p.user_id
            JOIN mst_users d ON c.depot_id = d.user_id
            JOIN tbc_depot_challan_books b ON c.id = b.challan_id
            JOIN tbc_books bk ON b.book_id = bk.id
            JOIN mst_subjects sb ON bk.subject_id = sb.id
            JOIN mst_medium m ON sb.medium::int = m.medium_cd
            WHERE c.id = $1`,
      [challanId]
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
      publisher_name: result.rows[0].publisher_name,
      publisher_address: result.rows[0].publisher_address,
      publisher_contact: result.rows[0].publisher_contact,
      publisher_email: result.rows[0].publisher_email,
      depot_name: result.rows[0].depot_name,
      depot_address: result.rows[0].depot_address,
      depot_contact: result.rows[0].depot_contact,
      depot_email: result.rows[0].depot_email,
      books: result.rows.map((row) => ({
        book_id: row.book_id,
        medium: row.medium,
        class_level: row.class_level,
        sets: row.sets,
        books_per_set: row.books_per_set,
        book_weight: row.book_weight,
        book_bundle_weight: row.book_weight * row.books_per_set,
        book_total: row.books_per_set * row.sets,
        book_remaining_qty: row.remaining_qty,
        book_total_weight: row.books_per_set * row.sets * row.book_weight,
        subject_name: row.name,
        class_name: row.class_level,
        medium_name: row.medium_name,
      })),
    };

    res.json({
      message: "Challan details fetched successfully",
      challan: challanData,
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Something went Wrong", error: error.message });
  }
};

const updatePublisherChallanStatus = async (req, res) => {
  /* #swagger.tags = ['Publisher Challan for Depot'] */
  /* #swagger.security = [{"Bearer": []}] */
  try {
    const { challan_id, remarks, received_quantity } = req.body;
    const challanId = parseInt(challan_id); // Ensure challan_id is an integer
    const receivedQuantity = parseInt(received_quantity); // Ensure received_quantity is an integer
    if (!challanId) {
      return res.status(400).json({ message: "challan Id is required" });
    }
  

    
   
    if (isNaN(Number(received_quantity))) {
      return res.status(400).json({
        message: "received_quantity must be a valid number",
      });
    }

    const result = await pool.query(
      `UPDATE tbc_depot_challans
         SET 
           remarks = COALESCE($1, remarks),
           received_quantity = COALESCE($2, received_quantity),
           verify = true
         WHERE id = $3
         RETURNING id, remarks, received_quantity, verify`,
      [remarks, Number(receivedQuantity), challanId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Challan not found" });
    }

    res.json({
      message: "Challan status updated successfully",
      challan: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating challan:", error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

module.exports = {
  updateDispatchStatus,
  assignBooksToChallan,
  getPublisherChallan,
  getSingleChallan,
  getChallanWithDetails,
  updatePublisherChallanStatus,
};
