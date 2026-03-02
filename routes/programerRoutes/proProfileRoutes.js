const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {
 getClusterOrders
} = require("../../controllers/cluster/clusterOrderController");

const router = express.Router();


// router.post("/create",authenticate, checkRole(['Publisher']), createChallan);
router.get("/",authenticate, checkRole(['Programmer']), getClusterOrders);


module.exports = router;
