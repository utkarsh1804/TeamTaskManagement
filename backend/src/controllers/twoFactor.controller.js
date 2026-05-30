const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const totp = require("../lib/totp");

const getStatus = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { twoFactorEnabled: true },
    });
    res.json({ enabled: Boolean(user?.twoFactorEnabled) });
  } catch (e) {
    next(e);
  }
};

const setup = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true, twoFactorEnabled: true },
    });
    if (user?.twoFactorEnabled) {
      return res.status(409).json({ success: false, error: "2FA is already enabled", code: "CONFLICT" });
    }
    const secret = totp.generateSecret();
    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });
    res.json({ secret, otpauthUrl: totp.otpauthURL(secret, user.email) });
  } catch (e) {
    next(e);
  }
};

const enable = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { twoFactorSecret: true },
    });
    if (!user?.twoFactorSecret) {
      return res.status(400).json({ success: false, error: "Run setup first", code: "BAD_REQUEST" });
    }
    if (!totp.verify(user.twoFactorSecret, req.body.token)) {
      return res.status(400).json({ success: false, error: "Invalid code", code: "INVALID_2FA" });
    }
    await prisma.user.update({ where: { id: req.user.id }, data: { twoFactorEnabled: true } });
    res.json({ success: true, enabled: true });
  } catch (e) {
    next(e);
  }
};

const disable = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { passwordHash: true },
    });
    const ok = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, error: "Invalid password", code: "INVALID_CREDENTIALS" });
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    res.json({ success: true, enabled: false });
  } catch (e) {
    next(e);
  }
};

module.exports = { getStatus, setup, enable, disable };
