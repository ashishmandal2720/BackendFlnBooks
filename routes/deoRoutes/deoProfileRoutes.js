const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {
  getProfile,
    updatePassword,
  updateProfile,

} = require("../../controllers/deo/deoProfileController");
const uploadImage = require("../../middlewares/uploadMiddleware");

const router = express.Router();


router.get("/profile",authenticate, checkRole(['Deo']), getProfile);
router.post("/change-password",authenticate, checkRole(['Deo']), updatePassword);

router.post("/update-profile",uploadImage.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'digital_signature', maxCount: 1 }
  ]),authenticate, checkRole(['Deo']), updateProfile);


module.exports = router;
