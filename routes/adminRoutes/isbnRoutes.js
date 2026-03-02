const express = require("express");
const { generateISBN, getISBNByAssignment, generateBarcode, downloadISBNPdf, getISBNDetails } = require("../../controllers/admin/isbnController");
const { checkRole, authenticate } = require("../../middlewares/authMiddleware");

const router = express.Router();

router.post("/generate_isbn",authenticate,checkRole(['Admin']), generateISBN);
router.post("/:assignment_id",authenticate,checkRole(['Admin']), generateISBN);
router.get("/:assignment_id",authenticate,checkRole(['Admin']), getISBNByAssignment);
router.get("/barcode/:assignment_id",authenticate,checkRole(['Admin']), generateBarcode);
router.get("/download/:assignment_id",authenticate,checkRole(['Admin']), downloadISBNPdf);
router.get("/getISBNDetails/:isbn_code", getISBNDetails);

module.exports = router;