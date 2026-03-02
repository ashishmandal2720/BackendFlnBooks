const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const { getPvtTeacher, getGovTeacher, getSchools, approveUser, updatePassword,getSearchAndRegistrationStatus} = require("../../controllers/programmer/proTchSchController");

const router = express.Router();


// router.post("/create",authenticate, checkRole(['Publisher']), createChallan);
router.get("/teacher/private",authenticate, checkRole(['Programmer']), getPvtTeacher);
router.get("/teacher/govt",authenticate, checkRole(['Programmer']), getGovTeacher);
router.get("/schools",authenticate, checkRole(['Programmer']), getSchools);

router.post("/approve/:id",authenticate, checkRole(['Programmer']), approveUser);
router.post("/update",authenticate, checkRole(['Programmer']), updatePassword);
router.get("/search", getSearchAndRegistrationStatus);


module.exports = router;
