const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const { getPvtTeacher, getGovTeacher, getSchools, approveUser, updatePassword } = require("../../controllers/cluster/clusterTchSchController");

const router = express.Router();


// router.post("/create",authenticate, checkRole(['Publisher']), createChallan);
router.get("/pvt/:cluster_id",authenticate, checkRole(['CAC']), getPvtTeacher);
router.get("/govt/:cluster_id",authenticate, checkRole(['CAC']), getGovTeacher);
router.get("/sch/:cluster_id",authenticate, checkRole(['CAC']), getSchools);

router.post("/approve/:id",authenticate, checkRole(['CAC']), approveUser);
router.post("/update",authenticate, checkRole(['CAC']), updatePassword);


module.exports = router;
