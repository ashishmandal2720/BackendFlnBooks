const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const { getPvtTeacher, getGovTeacher, getSchools, approveUser, updatePassword,
    getSearchAndRegistrationStatus,
    updateUsers,
    addTeacher,
    addContractTeacher
} = require("../../controllers/programmer/proTchSchController");

const router = express.Router();


// router.post("/create",authenticate, checkRole(['Publisher']), createChallan);
router.get("/teacher/private",authenticate, checkRole(['Programmer']), getPvtTeacher);
router.get("/teacher/govt",authenticate, checkRole(['Programmer']), getGovTeacher);
router.get("/schools",authenticate, checkRole(['Programmer']), getSchools);

router.post("/approve/:id",authenticate, checkRole(['Programmer']), approveUser);
router.post("/update/user", updateUsers);
router.post("/update",authenticate, checkRole(['Programmer']), updatePassword);
router.get("/search",authenticate, checkRole(['Programmer']), getSearchAndRegistrationStatus);
router.post("/add-teacher",authenticate, checkRole(['Programmer']), addTeacher);
router.post("/add-contract-teacher",authenticate, checkRole(['Programmer']), addContractTeacher);




module.exports = router;
