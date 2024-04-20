async function getBestProfession(req, res) {
  try {
    res.status(200).json({});
  } catch (err) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function getBestClients(req, res) {
  try {
    res.status(200).json({});
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
