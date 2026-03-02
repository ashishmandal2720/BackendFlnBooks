const express = require("express");
const upload = require("../../middlewares/uploadMiddleware");
const router = express.Router();
const {
  addSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  getSubjectByClass,
  xmlImportData,
  getSubjectsForAssignPublisher,
  getSubjectsForOrder
} = require("../../controllers/admin/subjectsController");
const { authenticate, checkRole } = require("../../middlewares/authMiddleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     Subject:
 *       type: object
 *       required:
 *         - name
 *         - class_level
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           description: Unique identifier for the subject.
 *         name:
 *           type: string
 *           maxLength: 255
 *           description: Name of the subject.
 *         class_level:
 *           type: string
 *           maxLength: 50
 *           description: Class level to which the subject belongs.
 *         district_id:
 *           type: string
 *           maxLength: 50
 *           nullable: true
 *           description: District ID associated with the subject.
 *         book_type:
 *           type: string
 *           maxLength: 50
 *           nullable: true
 *           description: Type of book associated with the subject.
 *         created_at:
 *           type: string
 *           format: date-time
 *           default: CURRENT_TIMESTAMP
 *           description: Timestamp when the subject was created.
 */

router.post("/", authenticate, checkRole(['Admin']), addSubject);
router.get("/class", getSubjectByClass);
router.post("/upload", upload.single("file"), xmlImportData);
router.post("/", authenticate, addSubject);
router.get("/publisher", authenticate, getSubjectsForAssignPublisher);
router.get("/order", authenticate, getSubjectsForOrder);
router.get("/", authenticate, getSubjects);
router.get("/:id",  getSubjectById);
router.put("/:id", authenticate, checkRole(['Admin']), updateSubject);
router.delete("/:id", authenticate, checkRole(['Admin']), deleteSubject);

module.exports = router;
