const { Op } = require("sequelize");
const { sequelize } = require("../model");

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

async function payForJob(req, res) {
  try {
    const { Job, Contract, Profile } = req.app.get("models");
    const jobId = Number(req.params.jobId);
    const { profile, body } = req;
    if (profile.type !== "client") {
      res.status(400).json({
        message: "Only client can pay",
      });
      return;
    }

    if (!body.amount || body.amount <= 0) {
      res.status(400).json({
        message: "Invalid amount value",
      });
      return;
    }

    await sequelize.transaction(async (t) => {
      let job = (
        await Job.findOne({
          include: Contract,
          where: {
            id: {
              [Op.eq]: jobId,
            },
          },
        })
      ).toJSON();

      if (!job) {
        throw new Error("job_not_found");
      }

      if (job.Contract.ClientId !== profile.id) {
        throw new Error("invalid_job");
      }

      if (job.paid) {
        throw new Error("job_already_paid");
      }

      if (job.Contract.status === "terminated") {
        throw new Error("contract_terminated");
      }

      if (job.price !== body.amount) {
        throw new Error("mismatch_amount");
      }

      const [{ dataValues: client }, { dataValues: contractor }] =
        await Promise.all([
          Profile.findOne({
            where: {
              id: {
                [Op.eq]: job.Contract.ClientId,
              },
            },
            transaction: t,
          }),
          Profile.findOne({
            where: {
              id: {
                [Op.eq]: job.Contract.ContractorId,
              },
            },
            transaction: t,
          }),
        ]);

      if (client.balance < body.amount) {
        throw new Error("invalid_balance");
      }

      await Promise.all([
        Job.update(
          { paid: true, paymentDate: new Date() },
          {
            where: {
              id: {
                [Op.eq]: jobId,
              },
            },
            transaction: t,
          }
        ),
        Contract.update(
          { status: "terminated" },
          {
            where: {
              id: {
                [Op.eq]: job.ContractId,
              },
            },
            transaction: t,
          }
        ),
        Profile.update(
          { balance: client.balance - Number(body.amount) },
          {
            where: {
              id: {
                [Op.eq]: job.Contract.ClientId,
              },
            },
            transaction: t,
          }
        ),
        Profile.update(
          { balance: contractor.balance + Number(body.amount) },
          {
            where: {
              id: {
                [Op.eq]: job.Contract.ContractorId,
              },
            },
            transaction: t,
          }
        ),
      ]);
    });

    res.status(200).json({
      message: "Successfully paid",
    });
  } catch (err) {
    console.log("[err]", err);
    if (err.message === "job_not_found") {
      res.status(404).json({
        message: "Job not found",
      });
      return;
    } else if (err.message === "invalid_balance") {
      res.status(400).json({
        message: "Invalid balance",
      });
      return;
    } else if (err.message === "invalid_job") {
      res.status(400).json({
        message: "Invalid client job",
      });
      return;
    } else if (err.message === "job_already_paid") {
      res.status(400).json({
        message: "Job already paid",
      });
      return;
    } else if (err.message === "contract_terminated") {
      res.status(400).json({
        message: "Contract terminated",
      });
      return;
    } else if (err.message === "mismatch_amount") {
      res.status(400).json({
        message: "Invalid pay amount",
      });
      return;
    }
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = {
  getUnpaidJobs,
  payForJob,
};
