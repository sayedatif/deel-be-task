const { Op } = require("sequelize");
const { sequelize } = require("../model");

async function addClientDeposit(req, res) {
  try {
    const { Profile, Contract, Job } = req.app.get("models");
    const { body, profile } = req;
    const { userId } = req.params;
    if (!body.amount || body.amount <= 0) {
      res.status(400).json({
        message: "Invalid amount",
      });
      return;
    }

    if (userId != profile.id || profile.type !== "client") {
      res.status(400).json({
        message: "Invalid profile",
      });
      return;
    }

    await sequelize.transaction(async (t) => {
      let records = await Contract.findAll({
        attributes: [
          "ClientId",
          [
            sequelize.literal('SUM("Jobs"."price") * 0.25'),
            "MaximumDepositAmount",
          ],
        ],
        include: [
          {
            model: Job,
            attributes: [],
            required: true,
          },
        ],
        where: {
          ClientId: userId,
        },
        group: ["ClientId"],
        transaction: t,
      });

      if (records.length === 0) {
        throw new Error("record_not_found");
      }

      records = records.map((r) => r.toJSON());
      if (body.amount > records[0].MaximumDepositAmount) {
        throw new Error("invalid_amount");
      }

      const clientProfile = await Profile.findOne({
        where: {
          id: {
            [Op.eq]: userId,
          },
        },
        transaction: t,
        lock: true,
      });

      clientProfile.balance = clientProfile.balance + body.amount;

      await clientProfile.save({ transaction: t });
    });

    res.status(200).json({
      message: "Successfully deposited",
    });
  } catch (err) {
    if (err.message === "record_not_found") {
      res.status(404).json({
        message: "No contract linked to clientId",
      });
    } else if (err.message === "invalid_amount") {
      res.status(400).json({
        message: "Invalid amount",
      });
    }
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = {
  addClientDeposit,
};
