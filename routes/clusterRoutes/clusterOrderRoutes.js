const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {
 getClusterOrders, 
 getClusterOrdersById,
 getChallanWithDetails,
 updateDepotChallanStatus,
 getBookClusterDistribution,
 getBookDistributionDetails,
 getDepotStockSummary,
 updateDepotChallanSIngle,
 getClusterReport,
clusterReportSchoolWise,
 getDistributionHistory,
 getHistoryDetails,
 deleteFullChallanWithHistory,
 updateBookDistribution,
 unverifyDepotChallanSingle,
 createClusterChallanEntry,
} = require("../../controllers/cluster/clusterOrderController");

const router = express.Router();


// router.post("/create",authenticate, checkRole(['Publisher']), createChallan);
router.get("/getClusterBookReport/:cluster_id",authenticate, checkRole(['CAC']), getClusterReport);
router.post("/clusterReportSchoolWise",authenticate, checkRole(['CAC']), clusterReportSchoolWise);
router.get("/history",authenticate, checkRole(['CAC']), getDistributionHistory);
router.get("/",authenticate, checkRole(['CAC']), getClusterOrders);
router.get("/details/get",authenticate, checkRole(['CAC']), getChallanWithDetails);
router.get("/get/stock",authenticate, checkRole(['CAC']), getDepotStockSummary);
router.get("/get/details",authenticate, checkRole(['CAC']), getBookClusterDistribution);
router.get("/history/get",authenticate, checkRole(['CAC']), getHistoryDetails);
router.get("/get/:challan_id",authenticate, checkRole(['CAC']), getBookDistributionDetails);
router.post("/update",authenticate, checkRole(['CAC']), updateDepotChallanStatus);
router.post("/update/single",authenticate, checkRole(['CAC']), updateDepotChallanSIngle);
router.post("/unverify/single",authenticate, checkRole(['CAC']), unverifyDepotChallanSingle);
router.post("/challan/add",authenticate, checkRole(['CAC']), createClusterChallanEntry);
router.post("/challan/delete",authenticate, checkRole(['CAC']), deleteFullChallanWithHistory);
router.post("/challan/update",authenticate, checkRole(['Depot','CAC']), updateBookDistribution);
router.get("/:challan_id",authenticate, checkRole(['CAC']), getClusterOrdersById);

module.exports = router;
