const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {
    confirmDeoReceipt,
    getDeoChallans,
    getChallanWithDetails
} = require("../../controllers/deo/deoOrderController");
const uploadImage = require("../../middlewares/uploadMiddleware");

const router = express.Router();


router.get("/get",authenticate, checkRole(['Deo']), getDeoChallans);
router.post("/recieved",authenticate, checkRole(['Deo']), confirmDeoReceipt);
router.get("/details/:challan_id",authenticate, checkRole(['Deo']), getChallanWithDetails);


module.exports = router;
