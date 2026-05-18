const prisma = require("../lib/prisma");
const { logActivity } = require("../lib/activityLog");
const { sendProjectInvite } = require("../lib/resend");

const userSelect = {
  id: true,
  name: true,
  email: true,
  globalRole: true,
  createdAt: true,
};

const getActor = (userId) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

const listProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.search;

    const where = {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };

    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        include: {
          owner: { select: userSelect },
          _count: { select: { tasks: true, members: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ items: projects, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

const createProject = async (req, res, next) => {
  try {
    const { name, description, status } = req.body;
    const userId = req.user.id;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        status: status || "ACTIVE",
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
      include: {
        owner: { select: userSelect },
        members: { include: { user: { select: userSelect } } },
      },
    });

    const actor = await getActor(userId);
    await logActivity(
      `${actor.name} created project "${project.name}"`,
      "Project",
      project.id,
      userId,
      project.id
    );

    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
};

const getProject = async (req, res, next) => {
  try {
    const projectId = req.params.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: userSelect },
        members: { include: { user: { select: userSelect } } },
      },
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found", code: "NOT_FOUND" });
    }

    const grouped = await prisma.task.groupBy({
      by: ["status"],
      where: { projectId },
      _count: { status: true },
    });

    const byStatus = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    grouped.forEach((row) => {
      byStatus[row.status] = row._count.status;
    });

    const totalTasks = Object.values(byStatus).reduce((sum, value) => sum + value, 0);

    res.json({ project, taskSummary: { total: totalTasks, byStatus } });
  } catch (error) {
    next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { name, description, status } = req.body;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found", code: "NOT_FOUND" });
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { name, description, status },
      include: { owner: { select: userSelect } },
    });

    const actor = await getActor(req.user.id);
    if (status && status !== project.status) {
      const message =
        status === "ARCHIVED"
          ? `${actor.name} archived project "${updated.name}"`
          : `${actor.name} updated project "${updated.name}"`;
      await logActivity(message, "Project", updated.id, actor.id, updated.id, {
        from: project.status,
        to: status,
      });
    } else if (name && name !== project.name) {
      await logActivity(
        `${actor.name} updated project "${updated.name}"`,
        "Project",
        updated.id,
        actor.id,
        updated.id
      );
    }

    res.json({ project: updated });
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found", code: "NOT_FOUND" });
    }

    if (project.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    const actor = await getActor(req.user.id);
    await logActivity(
      `${actor.name} deleted project "${project.name}"`,
      "Project",
      project.id,
      actor.id,
      project.id
    );

    await prisma.$transaction([
      prisma.task.deleteMany({ where: { projectId } }),
      prisma.projectMember.deleteMany({ where: { projectId } }),
      prisma.project.delete({ where: { id: projectId } }),
    ]);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { email, role } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found", code: "NOT_FOUND" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "User not found", code: "NOT_FOUND" });
    }

    if (user.id === project.ownerId) {
      return res
        .status(409)
        .json({ success: false, error: "User is already the owner", code: "CONFLICT" });
    }

    const existing = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: user.id, projectId } },
    });

    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: "Member already added", code: "CONFLICT" });
    }

    const membership = await prisma.projectMember.create({
      data: { projectId, userId: user.id, role },
      include: { user: { select: userSelect } },
    });

    const actor = await getActor(req.user.id);
    await logActivity(
      `${actor.name} added ${user.name} as ${role} to project "${project.name}"`,
      "ProjectMember",
      membership.id,
      actor.id,
      project.id
    );

    await sendProjectInvite({ to: user.email, projectName: project.name });

    res.status(201).json({ member: membership });
  } catch (error) {
    next(error);
  }
};

const updateMemberRole = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const userId = req.params.userId;
    const { role } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found", code: "NOT_FOUND" });
    }

    if (project.ownerId === userId) {
      return res
        .status(400)
        .json({ success: false, error: "Owner role cannot be changed", code: "BAD_REQUEST" });
    }

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
      include: { user: { select: userSelect } },
    });

    if (!membership) {
      return res
        .status(404)
        .json({ success: false, error: "Member not found", code: "NOT_FOUND" });
    }

    const updated = await prisma.projectMember.update({
      where: { id: membership.id },
      data: { role },
      include: { user: { select: userSelect } },
    });

    const actor = await getActor(req.user.id);
    await logActivity(
      `${actor.name} changed ${updated.user.name} role to ${role} in project "${project.name}"`,
      "ProjectMember",
      updated.id,
      actor.id,
      project.id,
      { role }
    );

    res.json({ member: updated });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const userId = req.params.userId;

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });

    if (!membership) {
      return res
        .status(404)
        .json({ success: false, error: "Member not found", code: "NOT_FOUND" });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, name: true },
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found", code: "NOT_FOUND" });
    }

    if (project.ownerId === userId) {
      return res
        .status(400)
        .json({ success: false, error: "Owner cannot be removed", code: "BAD_REQUEST" });
    }

    await prisma.projectMember.delete({ where: { id: membership.id } });

    getActor(req.user.id).then((actor) => {
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }).then((removed) => {
        if (actor && removed) {
          logActivity(
            `${actor.name} removed ${removed.name} from project "${project.name}"`,
            "ProjectMember",
            membership.id,
            req.user.id,
            projectId
          );
        }
      });
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  updateMemberRole,
  removeMember,
};
