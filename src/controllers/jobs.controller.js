const { Op } = require("sequelize");
const { sequelize } = require("../model");

async function getUnpaidJobs(req, res) {
  try {
    const { Contract, Job } = req.app.get("models");
    const { profile } = req;
    const activeContractsWithUnpaidJobs = await Job.findAll({
      where: {
        Paid: null,
      },
      include: [
        {
          model: Contract,
          attributes: [],
          where: {
            status: "in_progress",
            [Op.or]: [{ ContractorId: profile.id }, { ClientId: profile.id }],
          },
        },
      ],
    });

    res.json(activeContractsWithUnpaidJobs);
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
      let job = await Job.findOne({
        include: Contract,
        where: {
          id: {
            [Op.eq]: jobId,
          },
        },
        transaction: t,
        lock: true,
      });

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

      let [client, contractor, contract] = await Promise.all([
        Profile.findOne({
          where: { id: job.Contract.ClientId },
          transaction: t,
          lock: true,
        }),
        Profile.findOne({
          where: { id: job.Contract.ContractorId },
          transaction: t,
          lock: true,
        }),
        Contract.findOne({
          where: { id: job.Contract.id },
          transaction: t,
          lock: true,
        }),
      ]);

      if (!client || !contractor) {
        throw new Error("profile_not_found");
      }

      if (client.balance < body.amount) {
        throw new Error("invalid_balance");
      }

      client.balance -= Number(body.amount);
      contractor.balance += Number(body.amount);
      job.paid = true;
      job.paymentDate = new Date();
      contract.status = "terminated";

      await Promise.all([
        client.save({ transaction: t }),
        contractor.save({ transaction: t }),
        job.save({ transaction: t }),
        contract.save({ transaction: t }),
      ]);
    });

    res.status(200).json({
      message: "Successfully paid",
    });
  } catch (err) {
    const errorMessages = {
      job_not_found: { message: "Job not found", status: 404 },
      invalid_balance: { message: "Invalid balance", status: 400 },
      invalid_job: { message: "Invalid client job", status: 400 },
      job_already_paid: { message: "Job already paid", status: 400 },
      contract_terminated: { message: "Contract terminated", status: 400 },
      mismatch_amount: { message: "Invalid pay amount", status: 400 },
    };

    const errorInfo = errorMessages[err.message] || {
      message: "Internal server error",
      status: 500,
    };

    return res.status(errorInfo.status).json({ message: errorInfo.message });
  }
}

module.exports = {
  getUnpaidJobs,
  payForJob,
};
