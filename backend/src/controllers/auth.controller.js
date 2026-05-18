const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const {
  issueTokens,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  setAuthCookies,
  clearAuthCookies,
  hashToken,
} = require("../lib/auth");
const { autoAcceptPendingInvites } = require("./admin.controller");

const userSelect = {
  id: true,
  name: true,
  email: true,
  globalRole: true,
  avatarUrl: true,
  jobTitle: true,
  phone: true,
  timezone: true,
  departmentId: true,
  createdAt: true,
};

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

    const defaultOrg = await prisma.organization.findUnique({ where: { slug: "default" } });
    if (defaultOrg) {
      await prisma.orgMember.create({
        data: { userId: user.id, orgId: defaultOrg.id, role: "MEMBER" },
      });
    }

    const { accessToken, refreshToken } = await issueTokens(user, req);
    setAuthCookies(res, { accessToken, refreshToken });

    await autoAcceptPendingInvites(user.id, email);

    return res
      .status(201)
      .json({ user, token: accessToken, accessToken, refreshToken });
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
    if (!userWithPassword || userWithPassword.deletedAt) {
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
    const { accessToken, refreshToken } = await issueTokens(user, req);
    setAuthCookies(res, { accessToken, refreshToken });

    return res.json({ user, token: accessToken, accessToken, refreshToken });
  } catch (error) {
    return next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const provided = req.body?.refreshToken || req.cookies?.refreshToken;
    if (!provided) {
      return res.status(401).json({
        success: false,
        error: "Refresh token missing",
        code: "REFRESH_MISSING",
      });
    }

    const existing = await findRefreshToken(provided);
    if (!existing) {
      return res.status(401).json({
        success: false,
        error: "Invalid refresh token",
        code: "REFRESH_INVALID",
      });
    }

    if (existing.revokedAt) {
      // Token reuse — treat as compromise, revoke entire chain
      await revokeAllUserTokens(existing.userId);
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        error: "Refresh token reused — all sessions revoked",
        code: "REFRESH_REUSED",
      });
    }

    if (existing.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: "Refresh token expired",
        code: "REFRESH_EXPIRED",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: existing.userId },
      select: userSelect,
    });

    if (!user || user.deletedAt) {
      return res.status(401).json({
        success: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    const { accessToken, refreshToken, refreshRecord } = await issueTokens(user, req);
    await revokeRefreshToken(existing.tokenHash, refreshRecord.id);
    setAuthCookies(res, { accessToken, refreshToken });

    return res.json({ user, token: accessToken, accessToken, refreshToken });
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const provided = req.body?.refreshToken || req.cookies?.refreshToken;
    if (provided) {
      await revokeRefreshToken(hashToken(provided));
    }
    clearAuthCookies(res);
    res.json({ message: "Logged out" });
  } catch (error) {
    next(error);
  }
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

const updateProfile = async (req, res, next) => {
  try {
    const { name, jobTitle, phone, timezone, avatarUrl } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (jobTitle !== undefined) data.jobTitle = jobTitle;
    if (phone !== undefined) data.phone = phone;
    if (timezone !== undefined) data.timezone = timezone;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: userSelect,
    });
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const existing = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: "User not found", code: "NOT_FOUND" });
    }

    const isMatch = await bcrypt.compare(currentPassword, existing.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: "Current password is incorrect",
        code: "INVALID_CREDENTIALS",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });

    // Security: revoke all refresh tokens on password change
    await revokeAllUserTokens(req.user.id);

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return next(error);
  }
};

const listSessions = async (req, res, next) => {
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: { userId: req.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    res.json({ items: sessions });
  } catch (error) {
    next(error);
  }
};

const revokeSession = async (req, res, next) => {
  try {
    const session = await prisma.refreshToken.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found", code: "NOT_FOUND" });
    }
    await prisma.refreshToken.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const revokeAllSessions = async (req, res, next) => {
  try {
    await revokeAllUserTokens(req.user.id);
    clearAuthCookies(res);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  listSessions,
  revokeSession,
  revokeAllSessions,
};
