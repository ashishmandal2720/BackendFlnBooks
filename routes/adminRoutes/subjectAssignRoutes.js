const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const { assignSubject, getAssignments, getAssignmentsByPublisher, deleteAssignment } = require("../../controllers/admin/subjectAssignController");

const router = express.Router();

router.post("/", authenticate, checkRole(['Admin']), assignSubject);
router.get("/", authenticate, checkRole(['Admin']), getAssignments);
router.get("/:publisher_id", authenticate, checkRole(['Admin']), getAssignmentsByPublisher);
router.delete("/:id", authenticate, checkRole(['Admin']), deleteAssignment);

module.exports = router;