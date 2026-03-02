const express = require('express');
const router = express.Router();
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');

const { addBookDistribution,
    getBookDistribution,
    getBookDistributionDetails,
    confirmSchoolBookReceipt,
    confirmSchoolBookSingleReceipt,
    updateSchoolBookDistribution
} = require('../../controllers/school/schoolBookAssignmentController');

const {
    getPrivateSchoolsByDepot,
    getHighSchoolByDepot,
    getHighSchoolsByUdise,
    createBookDistribution,
    getStudentCounts,
    getSchoolByCluster,
    studentCountDepotWise,
    getClusterWiseSchools,
    scannedBooksCount
} = require('../../controllers/school/schoolController');

const { booksStdCount,
    getSubjectWiseStd,
    getSubjectWiseStd2,
    scanCode,
    scanBarCode } = require('../../controllers/school/schNewController');

router.post("/getPvtSchByDepot", getPrivateSchoolsByDepot);
router.post("/getHighSchoolByDepot", getHighSchoolByDepot);
router.post("/getSchoolByCluster", getSchoolByCluster);
router.post("/getHighSchoolsByUdise", getHighSchoolsByUdise);
router.post("/getStudentCounts", getStudentCounts);
router.post("/studentCountDepotWise", studentCountDepotWise);
router.post("/getClusterWiseSchools", getClusterWiseSchools);
router.post("/createBookDistribution", authenticate, checkRole(['Depot']), createBookDistribution);
router.post("/scannedBooksCount", scannedBooksCount);


router.post("/assign-book", authenticate, checkRole(['Depot', 'CAC']), addBookDistribution);
router.get("/get", authenticate, checkRole(['Depot', 'CAC']), getBookDistribution);
router.get("/get/:challan_id", authenticate, checkRole(['Depot', 'CAC']), getBookDistributionDetails);

router.post("/verify", authenticate, checkRole(['School', 'Teacher', 'PrivateTeacher']), confirmSchoolBookReceipt);
router.post("/distribute", authenticate, checkRole(['School', 'Teacher', 'PrivateTeacher']), updateSchoolBookDistribution);
router.post("/verify/single", authenticate, checkRole(['School', 'Teacher', 'PrivateTeacher']), confirmSchoolBookSingleReceipt);
router.get("/getCount/:udisecode", booksStdCount);
router.post("/scan-code", authenticate, checkRole(['School', 'Teacher', 'PrivateTeacher']), scanCode);
router.post("/scan-barcode", scanBarCode);
router.post("/getStdCount", authenticate, checkRole(['School', 'Teacher', 'PrivateTeacher']), getSubjectWiseStd);
router.post("/std-count", authenticate, checkRole(['School', 'Teacher', 'PrivateTeacher']), getSubjectWiseStd2);



module.exports = router;