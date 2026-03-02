const express = require('express');
const router = express.Router();
const { getDistrictData, getBlockData,getDepotData, getClusterData, getAllMedium, getAllDeoList, getAllCacList, getDivision,getClass

} = require('../controllers/masterDropDownCont');

router.get("/district-list", getDistrictData);
router.get("/depot-list", getDepotData);
router.get("/block-list", getBlockData);
router.get("/cluster-list", getClusterData);
router.get("/medium-list", getAllMedium);
router.post("/deo-list", getAllDeoList);
router.post("/cac-list", getAllCacList);
router.get("/division-list", getDivision);
router.get("/class-list", getClass);

module.exports = router;