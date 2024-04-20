const { Op } = require("sequelize");

async function getContractById(req, res) {
  try {
    const { Contract } = req.app.get("models");
    const { id } = req.params;
    const { dataValues: profile } = req.profile;
    const contract = await Contract.findOne({
      where: {
        id,
        [Op.or]: [{ ContractorId: profile.id }, { ClientId: profile.id }],
      },
    });
    if (!contract) return res.status(404).end();
    res.json(contract);
  } catch (err) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = {
  getContractById,
};
