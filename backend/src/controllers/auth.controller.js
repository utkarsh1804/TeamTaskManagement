const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { autoAcceptPendingInvites } = require("./admin.controller");

const userSelect = {
  id: true,
  name: true,
  email: true,
  globalRole: true,
  createdAt: true,
};

const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
};

const signToken = (user) =>
  jwt.sign({ id: user.id, globalRole: user.globalRole }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const register = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        error: "JWT secret is not configured",
        code: "CONFIG_ERROR",
      });
    }

    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, error: "Email already in use", code: "EMAIL_TAKEN" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, globalRole: "MEMBER" },
      select: userSelect,
    });

    const token = signToken(user);
    res.cookie("token", token, cookieOptions);

    await autoAcceptPendingInvites(user.id, email);

    return res.status(201).json({ user, token });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        error: "JWT secret is not configured",
        code: "CONFIG_ERROR",
      });
    }

    const { email, password } = req.body;

    const userWithPassword = await prisma.user.findUnique({ where: { email } });
    if (!userWithPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    const isMatch = await bcrypt.compare(password, userWithPassword.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    const user = await prisma.user.findUnique({ where: { email }, select: userSelect });
    const token = signToken(user);
    res.cookie("token", token, cookieOptions);

    await autoAcceptPendingInvites(user.id, email);

    return res.json({ user, token });
  } catch (error) {
    return next(error);
  }
};

const logout = (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.json({ message: "Logged out" });
};

const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: userSelect,
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "User not found", code: "NOT_FOUND" });
    }

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};
