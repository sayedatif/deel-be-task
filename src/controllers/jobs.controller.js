const { Op } = require("sequelize");

async function getUnpaidJobs(req, res) {
  try {
    const { Contract, Job } = req.app.get("models");
    const { profile } = req;
    const activeContracts = await Contract.findAll({
      where: {
        status: {
          [Op.eq]: "in_progress",
        },
        [Op.or]: [{ ContractorId: profile.id }, { ClientId: profile.id }],
      },
    });
    if (!activeContracts || activeContracts.length === 0) {
      return res.json([]);
    }
    const unpaidJobs = await Job.findAll({
      where: {
        ContractId: {
          [Op.in]: activeContracts.map((c) => c.id),
        },
        Paid: {
          [Op.is]: null,
        },
      },
    });
    res.json(unpaidJobs);
  } catch (err) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = {
  getUnpaidJobs,
};
