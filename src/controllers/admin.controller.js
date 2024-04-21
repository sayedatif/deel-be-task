const { Op } = require("sequelize");
const { sequelize } = require("../model");

async function getBestProfession(req, res) {
  try {
    const { Profile, Job, Contract } = req.app.get("models");
    const { start, end } = req.query;
    if (!start || !end) {
      res.status(400).json({
        message: "Invalid request, start and end is required",
      });
      return;
    }

    let result = await Job.findAll({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("price")), "price"],
        [sequelize.col("Contract.ContractorId"), "ContractorId"],
      ],
      include: [
        {
          model: Contract,
          attributes: [],
          where: { id: sequelize.col("Job.ContractId") },
        },
      ],
      where: {
        paid: true,
        createdAt: {
          [Op.between]: [start, end],
        },
      },
      group: ["Contract.ContractorId"],
      order: [[sequelize.literal("price"), "DESC"]],
      limit: 1,
    });

    if (result.length === 0) {
      res.json({});
      return;
    }

    result = result[0].toJSON();
    const contractorProfile = (
      await Profile.findOne({
        where: {
          id: {
            [Op.eq]: result.ContractorId,
          },
        },
      })
    )?.toJSON();

    res.json({
      id: contractorProfile.id,
      fullName: contractorProfile.fullName,
      totalPrice: result.price,
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function getBestClients(req, res) {
  try {
    const { Profile, Job, Contract } = req.app.get("models");
    const { start, end, limit = 2 } = req.query;
    if (!start || !end) {
      res.status(400).json({
        message: "Invalid request, start and end is required",
      });
      return;
    }

    let records = await Job.findAll({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("price")), "TotalPaid"],
        [sequelize.col("Contract.ClientId"), "ClientId"],
      ],
      include: [
        {
          model: Contract,
          attributes: [],
          where: { id: sequelize.col("Job.ContractId") },
        },
      ],
      where: {
        paid: true,
        createdAt: {
          [Op.between]: [start, end],
        },
      },
      group: ["Contract.ClientId"],
      order: [[sequelize.literal("TotalPaid"), "DESC"]],
      limit: limit,
    });

    if (records.length === 0) {
      res.json([]);
      return;
    }

    records = records.map((r) => r.toJSON());
    const clientProfile = await Profile.findAll({
      where: {
        id: {
          [Op.in]: records.map((r) => r.ClientId),
        },
      },
    });

    const clientObj = {};
    for (const c of clientProfile) {
      clientObj[c.id] = c;
    }

    const result = records.map((r) => ({
      id: r.ClientId,
      fullName: clientObj[r.ClientId].fullName,
      paid: r.TotalPaid,
    }));

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = {
  getBestProfession,
  getBestClients,
};