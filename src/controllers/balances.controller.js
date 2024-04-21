async function addClientDeposit(req, res) {
  try {
    res.status(200).json({});
  } catch (err) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = {
  addClientDeposit,
};
