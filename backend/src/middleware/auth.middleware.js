const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      error: "JWT secret is not configured",
      code: "CONFIG_ERROR",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" });
  }
};

module.exports = authMiddleware;
