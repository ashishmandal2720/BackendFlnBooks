const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {

  updatePassword,
  updateProfile,
  getProfile,
} = require("../../controllers/school/schoolProfileController");
const uploadImage = require("../../middlewares/uploadMiddleware");

const router = express.Router();

router.get("/profile", authenticate, checkRole(['Schools']), getProfile);
router.post("/change-password",authenticate, checkRole(['Schools']), updatePassword);

router.post("/update-profile",uploadImage.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'digital_signature', maxCount: 1 }
  ]),authenticate, checkRole(['Schools']), updateProfile);


module.exports = router;
