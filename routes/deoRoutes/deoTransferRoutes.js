const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const { getSearchTeacher,getSchools, updateTeacherTransfer, getUdiseCode, getTransferCount, getTransferHistory} = require("../../controllers/deo/deoTransferController");

const router = express.Router();


router.get("/search", getSearchTeacher);
router.get("/find-school", getSchools);
router.post("/update", updateTeacherTransfer);
router.get("/udisecode", getUdiseCode);
router.get("/count", getTransferCount);
router.get("/history", getTransferHistory);
module.exports = router;

