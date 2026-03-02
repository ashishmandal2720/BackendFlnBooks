const {pool} = require("../../config/db");
const assignBooksToDepot = async (req, res) => {
      /* #swagger.tags = ['Publisher To Depot'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
      const { depot_id, book_id, sets, books_per_set, extra_books } = req.body;
      const depotId = parseInt(depot_id); // Ensure depot_id is an integer
      const bookId = parseInt(book_id); // Ensure book_id is an integer
      const setsNumber = parseInt(sets); // Ensure sets is an integer
      const booksPerSet = parseInt(books_per_set); // Ensure books_per_set is an integer
      const extraBooks = parseInt(extra_books); // Ensure extra_books is an integer

      const publisher_id = req.user.id;
  
      // Check if depot exists in users table
      const depotCheck = await pool.query("SELECT * FROM mst_users WHERE id = $1 AND role_id = 4", [depotId]);
      if (depotCheck.rows.length === 0) {
        return res.status(404).json({ message: "Depot not found" });
      }
  
      if (booksPerSet < 25 || booksPerSet > 50) {
        return res.status(400).json({ message: "Books per set must be between 25 and 50" });
      }
  
      const assignment = await pool.query(
        `INSERT INTO tbc_depot_assignments (depot_id, challan_id,challan_date, publisher_id, book_id, total_sets, books_per_set, extra_books,weight_per_set,weight_per_book)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [depotId, publisher_id, bookId, setsNumber, booksPerSet, extraBooks]
      );
      await pool.query(
        "INSERT INTO tbc_notifications (user_id, message) VALUES ($1, $2)",
        [depotId, `A new Challan -${assignment.rows[0].challan_id}  has been assigned to you.`]
      );
  
      res.status(201).json({ message: "Books assigned to depot successfully", assignment: assignment.rows[0] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  const submitDispatchDetails = async (req, res) => {
        /* #swagger.tags = ['Publisher To Depot'] */
    /* #swagger.security = [{"Bearer": []}] */
    try {
      const { depot_assignment_id, travel_agency, driver_name, driver_contact, vehicle_number, vehicle_name, dispatch_date } = req.body;

      const depotAssignmentId = parseInt(depot_assignment_id); // Ensure depot_assignment_id is an integer
      // Ensure depot assignment exists
      const assignmentCheck = await pool.query("SELECT * FROM tbc_depot_assignments WHERE id = $1", [depotAssignmentId]);
      if (assignmentCheck.rows.length === 0) {
        return res.status(404).json({ message: "Depot assignment not found" });
      }
  
      const dispatch = await pool.query(
        `INSERT INTO tbc_dispatch_details (depot_assignment_id, travel_agency, driver_name, driver_contact, vehicle_number, vehicle_name, dispatch_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [depotAssignmentId, travel_agency, driver_name, driver_contact, vehicle_number, vehicle_name, dispatch_date]
      );
  
      res.status(201).json({ message: "Dispatch details submitted successfully", dispatch: dispatch.rows[0] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

module.exports = { assignBooksToDepot, submitDispatchDetails };