const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {

  getPubOrders,
  getPubOrdersById,
  publisherVerifyContent,
} = require("../../controllers/pub/assignmentController");
const { generateBarcodePDFHandler, generateBarcodeExcelHandler } = require("../../controllers/pub/assignmentControllerBar");

const router = express.Router();


router.get("/",authenticate, checkRole(['Publisher']), getPubOrders);
router.post("/verify-content",authenticate, checkRole(['Publisher']), publisherVerifyContent);
router.get("/:order_id",authenticate, checkRole(['Publisher']), getPubOrdersById);
router.get("/generate/:order_id",authenticate, checkRole(['Publisher']), generateBarcodePDFHandler);
router.post("/generate-excel", authenticate, checkRole(['Publisher']), generateBarcodeExcelHandler);


module.exports = router;
