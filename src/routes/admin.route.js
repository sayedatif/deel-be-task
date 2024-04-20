const express = require("express");

const router = express.Router();
const { getAdminProfile } = require("../middleware/getAdminProfile");
const adminController = require("../controllers/admin.controller");

router.get(
  "/best-profession",
  getAdminProfile,
  adminController.getBestProfession
);
router.get("/best-clients", getAdminProfile, adminController.getBestClients);

module.exports = router;
