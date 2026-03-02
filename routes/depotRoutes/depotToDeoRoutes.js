const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {
assignBooksToDEO,
getDepotDeoChallans,
getChallanWithDetails
} = require("../../controllers/depot/depotDistController");

const router = express.Router();


router.post("/assign",authenticate, checkRole(['Depot']), assignBooksToDEO);
router.get("/get",authenticate, checkRole(['Depot']), getDepotDeoChallans);
router.get("/details/:challan_id",authenticate, checkRole(['Depot']), getChallanWithDetails);


module.exports = router;
