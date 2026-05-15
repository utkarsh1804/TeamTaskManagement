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

const listAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, globalRole: true },
      orderBy: { name: "asc" },
    });

    return res.json({ items: users });
  } catch (error) {
    return next(error);
  }
};

const addMembersToProject = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Provide an array of userIds", code: "INVALID_INPUT" });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found", code: "NOT_FOUND" });
    }

    const existingMembers = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });

    const existingIds = new Set(existingMembers.map((m) => m.userId));
    const toAdd = userIds.filter((uid) => !existingIds.has(uid));

    if (toAdd.length === 0) {
      return res.json({ success: true, message: "All users already in project", added: 0 });
    }

    await prisma.projectMember.createMany({
      data: toAdd.map((userId) => ({ projectId, userId, role: "MEMBER" })),
      skipDuplicates: true,
    });

    return res.status(201).json({
      success: true,
      message: `Added ${toAdd.length} member${toAdd.length > 1 ? "s" : ""} to project`,
      added: toAdd.length,
    });
  } catch (error) {
    return next(error);
  }
};

const getMemberDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const member = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        globalRole: true,
        createdAt: true,
        memberships: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
        assignedTasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            projectId: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
        _count: {
          select: {
            assignedTasks: true,
            createdTasks: true,
            memberships: true,
          },
        },
      },
    });

    if (!member) {
      return res
        .status(404)
        .json({ success: false, error: "User not found", code: "NOT_FOUND" });
    }

    const tasksByStatus = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };
    member.assignedTasks.forEach((t) => {
      tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    });

    return res.json({
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        globalRole: member.globalRole,
        createdAt: member.createdAt,
        projects: member.memberships.map((m) => ({
          projectId: m.project.id,
          projectName: m.project.name,
          projectStatus: m.project.status,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        tasks: member.assignedTasks,
        taskStats: {
          total: member._count.assignedTasks,
          created: member._count.createdTasks,
          byStatus: tasksByStatus,
        },
        projectCount: member._count.memberships,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const moveMemberToProject = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { fromProjectId, toProjectId, role } = req.body;

    if (!fromProjectId || !toProjectId) {
      return res
        .status(400)
        .json({ success: false, error: "fromProjectId and toProjectId required", code: "INVALID_INPUT" });
    }

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId: fromProjectId } },
    });

    if (!membership) {
      return res
        .status(404)
        .json({ success: false, error: "Not a member of source project", code: "NOT_FOUND" });
    }

    const existing = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId: toProjectId } },
    });

    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: "Already a member of target project", code: "CONFLICT" });
    }

    await prisma.$transaction([
      prisma.projectMember.delete({ where: { id: membership.id } }),
      prisma.projectMember.create({
        data: { userId, projectId: toProjectId, role: role || "MEMBER" },
      }),
    ]);

    return res.json({ success: true, message: "Member moved to project" });
  } catch (error) {
    return next(error);
  }
};

const removeMemberFromProject = async (req, res, next) => {
  try {
    const { userId, projectId } = req.params;

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });

    if (!membership) {
      return res
        .status(404)
        .json({ success: false, error: "Member not found in project", code: "NOT_FOUND" });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (project?.ownerId === userId) {
      return res
        .status(400)
        .json({ success: false, error: "Owner cannot be removed", code: "BAD_REQUEST" });
    }

    await prisma.projectMember.delete({ where: { id: membership.id } });

    return res.json({ success: true, message: "Member removed from project" });
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
  listAllUsers,
  addMembersToProject,
  getMemberDetails,
  moveMemberToProject,
  removeMemberFromProject,
};
