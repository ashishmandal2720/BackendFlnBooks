const express = require('express');
const { registerUser,registerUserNew,insertCacUsers, loginUser,getRole,getRoleId, getUserByIdAndRole,insertDeoUsers,insertProgrammerUsers, insertBeoUsers,insertJoinDirectorUsers } = require('../../controllers/authController');
const { authenticate } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.get('/register/all-cac', insertCacUsers);
router.get('/register/all-deo', insertDeoUsers);
router.get('/register/all-beo', insertBeoUsers);
router.get('/register/all-programmer', insertProgrammerUsers);
router.get('/register/all-join-director', insertJoinDirectorUsers);
router.post('/register/new', registerUserNew);
router.post('/login', loginUser);
router.get('/roles', getRole);
router.get('/user/find', getUserByIdAndRole);
router.get('/user/roles', authenticate,getRoleId);

module.exports = router;