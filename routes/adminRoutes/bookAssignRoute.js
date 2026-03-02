const express = require("express");
const { assignBook, getAllAssignments,updateBookAssignmentQuantity, getAssignmentsByPublisher,publisherVerifyOrder } = require("../../controllers/admin/bookAssignController");
const { authenticate,checkRole } = require("../../middlewares/authMiddleware");

const   router = express.Router();

router.post("/",authenticate,checkRole(['Admin']), assignBook);
router.put("/update",authenticate,checkRole(['Admin']), updateBookAssignmentQuantity); 
router.get("/",authenticate,checkRole(['Admin']), getAllAssignments);
router.get("/:publisher_id",authenticate,checkRole(['Admin']), getAssignmentsByPublisher);
router.post("/publisherVerifyOrder", publisherVerifyOrder);

module.exports = router;
