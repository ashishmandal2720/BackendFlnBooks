const express = require("express");
const { authenticate, checkRole } = require('../../middlewares/authMiddleware');
const {

  getDepot,
  getDepotById,

} = require("../../controllers/admin/depotController");

const router = express.Router();


router.get("/",authenticate, checkRole(['Admin','Publisher','District']), getDepot);
router.get("/:id",authenticate, checkRole(['Admin','Publisher']), getDepotById);


module.exports = router;
