const { Op } = require("sequelize");

const getAdminProfile = async (req, res, next) => {
  const { Profile } = req.app.get("models");
  const profile = await Profile.findOne({
    where: {
      id: req.get("profile_id") || 0,
      type: {
        [Op.eq]: "admin",
      },
    },
  });
  if (!profile) return res.status(401).end();
  req.profile = profile.toJSON();
  next();
};
module.exports = { getAdminProfile };
