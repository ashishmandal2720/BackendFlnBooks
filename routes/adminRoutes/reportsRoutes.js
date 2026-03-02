const express = require('express');
const router = express.Router();
const {authenticate} = require('../../middlewares/authMiddleware');
const depotController = require('../../controllers/admin/reportsController');
const { getAllCount, getClusterWiseCount } = require('../../controllers/admin/clusterReportController');

router.post('/depots', depotController.getDepotList);
router.get('/cluster/count', getAllCount);
router.get('/cluster/total-count', getClusterWiseCount);
router.post('/depots', depotController.getDepotList);
router.post('/depots/districts', depotController.getDepotDistrictList);
router.post('/student-book-distribution', depotController.getStudentBookDistributionReport);
router.post('/depot-division-book-distribution', depotController.BookDistributionReportDetails);
router.post('/school-list', depotController.SchoolListReport);
router.post('/school-scanning', depotController.getSchoolScanningReportController);
router.get('/card-counts', depotController.getCardCounts);
module.exports = router;
