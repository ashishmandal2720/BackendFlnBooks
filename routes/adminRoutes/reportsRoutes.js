const express = require('express');
const router = express.Router();
const depotController = require('../../controllers/admin/reportsController');

router.post('/depots', depotController.getDepotList);
router.post('/depots/districts', depotController.getDepotDistrictList);
router.post('/student-book-distribution', depotController.getStudentBookDistributionReport);
router.post('/depot-division-book-distribution', depotController.BookDistributionReportDetails);
router.get('/card-counts', depotController.getCardCounts);
module.exports = router;
