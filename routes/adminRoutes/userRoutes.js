const express = require('express');
const { getUsers, 
    approveUser,
    addUser,
    updateUser,
    deleteUser,
    updatePassword,

} = require('../../controllers/userController');
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const { getVerfiedUsersCount } = require('../../controllers/admin/DashboardController');

const router = express.Router();

router.post("/",authenticate, checkRole(['Admin']), addUser);
router.get('/', authenticate, checkRole(['Admin']), getUsers);
router.put('/approve/:id', authenticate, checkRole(['Admin']), approveUser);
router.put("/:id",authenticate, checkRole(['Admin']), updateUser);
router.delete("/:id",authenticate, checkRole(['Admin']), deleteUser);
router.post("/update-password",authenticate, updatePassword);
router.get("/verified-count", getVerfiedUsersCount);

module.exports = router;
