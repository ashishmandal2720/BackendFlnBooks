const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {

  updatePassword,
  updateProfile,
  getProfile,

} = require("../../controllers/depot/depotProfileController");
const uploadImage = require("../../middlewares/uploadMiddleware");

const router = express.Router();

router.get("/profile", authenticate, checkRole(['Depot']),getProfile);
router.post("/change-password",authenticate, checkRole(['Depot']), updatePassword);

router.post("/update-profile",uploadImage.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'digital_signature', maxCount: 1 }
  ]),authenticate, checkRole(['Depot']), updateProfile);


module.exports = router;
