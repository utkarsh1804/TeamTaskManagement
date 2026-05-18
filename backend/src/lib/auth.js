const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const prisma = require("./prisma");

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "7d";
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "30", 10);

const isProd = process.env.NODE_ENV === "production";

const cookieBase = {
  httpOnly: true,
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
};

const accessCookieOptions = { ...cookieBase, maxAge: 1000 * 60 * 60 * 24 * 7 };
const refreshCookieOptions = {
  ...cookieBase,
  maxAge: 1000 * 60 * 60 * 24 * REFRESH_TOKEN_TTL_DAYS,
};

const signAccessToken = (user) =>
  jwt.sign({ id: user.id, globalRole: user.globalRole }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const generateRefreshToken = () => crypto.randomBytes(48).toString("hex");

const issueRefreshToken = async (userId, { userAgent, ipAddress, replacedById } = {}) => {
  const raw = generateRefreshToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const record = await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      replacedById: replacedById || null,
    },
  });

  return { token: raw, record };
};

const revokeRefreshToken = async (tokenHash, replacedById) => {
  return prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date(), replacedById: replacedById || null },
  });
};

const revokeAllUserTokens = (userId) =>
  prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

const findRefreshToken = (rawToken) =>
  prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  if (accessToken) res.cookie("token", accessToken, accessCookieOptions);
  if (refreshToken) res.cookie("refreshToken", refreshToken, refreshCookieOptions);
};

const clearAuthCookies = (res) => {
  res.clearCookie("token", { ...cookieBase, maxAge: 0 });
  res.clearCookie("refreshToken", { ...cookieBase, maxAge: 0 });
};

const issueTokens = async (user, req) => {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, record } = await issueRefreshToken(user.id, {
    userAgent: req?.headers?.["user-agent"],
    ipAddress: req?.ip,
  });
  return { accessToken, refreshToken, refreshRecord: record };
};

module.exports = {
  signAccessToken,
  hashToken,
  generateRefreshToken,
  issueRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  findRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  issueTokens,
  cookieBase,
};
