const express = require('express');
const { registerUser, loginUser,getRole,getRoleId } = require('../../controllers/authController');
const { authenticate } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/roles', getRole);
router.get('/user/roles', authenticate,getRoleId);

module.exports = router;