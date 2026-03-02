const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {

  updatePassword,
  updateProfile,
  getProfile,
} = require("../../controllers/pub/publisherProfileConstroller");
const uploadImage = require("../../middlewares/uploadMiddleware");

const router = express.Router();


router.get("/profile",authenticate, checkRole(['Publisher']), getProfile);
router.post("/change-password",authenticate, checkRole(['Publisher']), updatePassword);

router.post("/update-profile",uploadImage.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'digital_signature', maxCount: 1 }
  ]),authenticate, checkRole(['Publisher']), updateProfile);


module.exports = router;
