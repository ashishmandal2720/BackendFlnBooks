const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {
  getProfile,
    updatePassword,
  updateProfile,

} = require("../../controllers/cluster/clusterProfileController");
const uploadImage = require("../../middlewares/uploadMiddleware");

const router = express.Router();


router.get("/profile",authenticate, checkRole(['Cluster']), getProfile);
router.post("/change-password",authenticate, checkRole(['Cluster']), updatePassword);

router.post("/update-profile",uploadImage.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'digital_signature', maxCount: 1 }
  ]),authenticate, checkRole(['Cluster']), updateProfile);


module.exports = router;
