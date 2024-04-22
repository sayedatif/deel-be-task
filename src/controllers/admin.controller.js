const { Op, literal } = require("sequelize");
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

    const result = await Job.findAll({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("price")), "price"],
        [literal(`CONCAT("firstName", ' ', "lastName")`), "fullName"],
        [sequelize.col("Contract.ContractorId"), "ContractorId"],
      ],
      include: [
        {
          model: Contract,
          attributes: [],
          where: { id: sequelize.col("Job.ContractId") },
          include: [
            {
              model: Profile,
              attributes: [],
              where: { id: sequelize.col("Contract.ContractorId") },
              as: "Contractor",
            },
          ],
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
      throw new Error("empty_result");
    }

    res.json(result[0]);
  } catch (err) {
    if (err.message === "empty_result") {
      res.status(200).json({});
      return;
    }
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

    const result = await Job.findAll({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("price")), "paid"],
        [literal(`CONCAT("firstName", ' ', "lastName")`), "fullName"],
        [sequelize.col("Contract.ClientId"), "id"],
      ],
      include: [
        {
          model: Contract,
          attributes: [],
          where: { id: sequelize.col("Job.ContractId") },
          include: [
            {
              model: Profile,
              attributes: [],
              where: { id: sequelize.col("Contract.ClientId") },
              as: "Client",
            },
          ],
        },
      ],
      where: {
        paid: true,
        createdAt: {
          [Op.between]: [start, end],
        },
      },
      group: ["Contract.ClientId"],
      order: [[sequelize.literal("paid"), "DESC"]],
      limit: limit,
    });

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
