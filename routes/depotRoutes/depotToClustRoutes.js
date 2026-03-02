const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {
assignBooksToCluster,
getDepotClusterChallans,
getChallanWithDetails
} = require("../../controllers/depot/depotClusterController");

const router = express.Router();


router.post("/assign",authenticate, checkRole(['Depot']), assignBooksToCluster);
router.get("/get",authenticate, checkRole(['Depot']), getDepotClusterChallans);
router.get("/details/:challan_id",authenticate, checkRole(['Depot']), getChallanWithDetails);


module.exports = router;
