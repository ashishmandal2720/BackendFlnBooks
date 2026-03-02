const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {
 getClusterOrders, 
 getClusterOrdersById,
 getChallanWithDetails,
 updateDepotChallanStatus,
 getBookClusterDistribution,
 getBookDistributionDetails
} = require("../../controllers/cluster/clusterOrderController");

const router = express.Router();


// router.post("/create",authenticate, checkRole(['Publisher']), createChallan);
router.get("/",authenticate, checkRole(['CAC']), getClusterOrders);
router.get("/:challan_id",authenticate, checkRole(['CAC']), getClusterOrdersById);
router.get("/details/:challan_id",authenticate, checkRole(['CAC']), getChallanWithDetails);

router.get("/get/details",authenticate, checkRole(['CAC']), getBookClusterDistribution);
router.get("/get/:challan_id",authenticate, checkRole(['CAC']), getBookDistributionDetails);
router.post("/update",authenticate, checkRole(['CAC']), updateDepotChallanStatus);


module.exports = router;
