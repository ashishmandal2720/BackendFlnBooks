const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {
    getDepotOrders,getDepotOrdersById,
    getChallanWithDetails
} = require("../../controllers/depot/depotOrderController");

const router = express.Router();


// router.post("/create",authenticate, checkRole(['Publisher']), createChallan);
router.get("/order/",authenticate, checkRole(['Depot']), getDepotOrders);
router.get("/order/:challan_id",authenticate, checkRole(['Depot']), getDepotOrdersById);
router.get("/details/:challan_id",authenticate, checkRole(['Depot']), getChallanWithDetails);


module.exports = router;
