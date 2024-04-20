const express = require("express");

const router = express.Router();
const { getProfile } = require("../middleware/getProfile");
const contractsController = require("../controllers/contracts.controller");

router.get("/:id", getProfile, contractsController.getContractById);
router.get("", getProfile, contractsController.getContracts);

module.exports = router;
