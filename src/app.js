const express = require("express");
const bodyParser = require("body-parser");
const { sequelize } = require("./model");
const contractsRoute = require("./routes/contracts.route");
const jobsRoute = require("./routes/jobs.route");

const app = express();
app.use(bodyParser.json());
app.set("sequelize", sequelize);
app.set("models", sequelize.models);

app.use("/contracts", contractsRoute);
app.use("/jobs", jobsRoute);

module.exports = app;
