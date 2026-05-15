const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../lib/prisma");

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

const requestAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, error: "Email already in use", code: "EMAIL_TAKEN" });
    }

    const existingRequest = await prisma.adminRequest.findUnique({ where: { email } });
    if (existingRequest) {
      return res.status(409).json({
        success: false,
        error: "Admin request already submitted",
        code: "REQUEST_EXISTS",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const request = await prisma.adminRequest.create({
      data: { name, email, passwordHash },
    });

    return res.status(201).json({
      success: true,
      message: "Admin request submitted. Awaiting approval.",
      requestId: request.id,
    });
  } catch (error) {
    return next(error);
  }
};

const listAdminRequests = async (req, res, next) => {
  try {
    const requests = await prisma.adminRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    return res.json({ items: requests });
  } catch (error) {
    return next(error);
  }
};

const approveAdminRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const adminRequest = await prisma.adminRequest.findUnique({ where: { id } });
    if (!adminRequest) {
      return res
        .status(404)
        .json({ success: false, error: "Request not found", code: "NOT_FOUND" });
    }

    if (adminRequest.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        error: "Request already processed",
        code: "ALREADY_PROCESSED",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: adminRequest.email },
    });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, error: "Email already in use", code: "EMAIL_TAKEN" });
    }

    const user = await prisma.user.create({
      data: {
        name: adminRequest.name,
        email: adminRequest.email,
        passwordHash: adminRequest.passwordHash,
        globalRole: "ADMIN",
      },
      select: userSelect,
    });

    await prisma.adminRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
    });

    const token = signToken(user);
    res.cookie("token", token, cookieOptions);

    return res.json({
      success: true,
      message: "Admin request approved",
      user,
      token,
    });
  } catch (error) {
    return next(error);
  }
};

const rejectAdminRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const adminRequest = await prisma.adminRequest.findUnique({ where: { id } });
    if (!adminRequest) {
      return res
        .status(404)
        .json({ success: false, error: "Request not found", code: "NOT_FOUND" });
    }

    if (adminRequest.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        error: "Request already processed",
        code: "ALREADY_PROCESSED",
      });
    }

    await prisma.adminRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
    });

    return res.json({ success: true, message: "Admin request rejected" });
  } catch (error) {
    return next(error);
  }
};

const generateInviteLink = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { role } = req.body;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found", code: "NOT_FOUND" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const inviteLink = await prisma.inviteLink.create({
      data: { token, projectId, role: role || "MEMBER", expiresAt },
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const link = `${frontendUrl}/invite/${token}`;

    return res.status(201).json({ link, expiresAt: inviteLink.expiresAt });
  } catch (error) {
    return next(error);
  }
};

const acceptInviteLink = async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    const invite = await prisma.inviteLink.findUnique({ where: { token } });

    if (!invite) {
      return res
        .status(404)
        .json({ success: false, error: "Invite not found", code: "NOT_FOUND" });
    }

    if (invite.usedAt) {
      return res
        .status(410)
        .json({ success: false, error: "Invite already used", code: "GONE" });
    }

    if (invite.expiresAt < new Date()) {
      return res
        .status(410)
        .json({ success: false, error: "Invite expired", code: "GONE" });
    }

    const project = await prisma.project.findUnique({
      where: { id: invite.projectId },
    });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found", code: "NOT_FOUND" });
    }

    const existing = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId, projectId: invite.projectId },
      },
    });

    if (existing) {
      await prisma.inviteLink.update({ where: { token }, data: { usedAt: new Date() } });
      return res.json({
        success: true,
        message: "Already a member",
        projectId: invite.projectId,
      });
    }

    const membership = await prisma.projectMember.create({
      data: { projectId: invite.projectId, userId, role: invite.role },
    });

    await prisma.inviteLink.update({ where: { token }, data: { usedAt: new Date() } });

    return res.status(201).json({
      success: true,
      message: "Joined project",
      projectId: invite.projectId,
      role: invite.role,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  requestAdmin,
  listAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  generateInviteLink,
  acceptInviteLink,
};
