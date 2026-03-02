const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {
    assignBooksToChallan,updateDispatchStatus,
    getSingleChallan,
    getPublisherChallan,
    getChallanWithDetails,
    updatePublisherChallanStatus
} = require("../../controllers/pub/challanController");

const router = express.Router();


// router.post("/create",authenticate, checkRole(['Publisher']), createChallan);
router.get("/",authenticate, checkRole(['Publisher']), getPublisherChallan);
router.get("/single/:challan_id",authenticate, checkRole(['Publisher']), getSingleChallan);
router.get("/details/:challan_id",authenticate, checkRole(['Publisher']), getChallanWithDetails);
router.post("/assign",authenticate, checkRole(['Publisher']), assignBooksToChallan);
router.post("/update",authenticate, checkRole(['Publisher']), updateDispatchStatus);
router.post("/update-status",authenticate, updatePublisherChallanStatus);


module.exports = router;
