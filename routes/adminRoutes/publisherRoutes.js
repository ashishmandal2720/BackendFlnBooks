const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {

  getPublishers,
  getPublisherById,
  getAllPublishers

} = require("../../controllers/admin/publisherController");

const router = express.Router();


router.get("/",authenticate, checkRole(['Admin']), getPublishers);
router.get("/:id",authenticate, checkRole(['Admin','publisher']), getPublisherById);
router.get("/getAllPublishers", getAllPublishers);


module.exports = router;
