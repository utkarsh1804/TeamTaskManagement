const prisma = require("../lib/prisma");

const getProjectId = (req) => req.params.id || req.params.projectId;

const requireGlobalAdmin = (req, res, next) => {
  if (req.user?.globalRole === "ADMIN") {
    return next();
  }

  return res
    .status(403)
    .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
};

const requireProjectAccess = async (req, res, next) => {
  try {
    const projectId = getProjectId(req);
    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, error: "Project ID missing", code: "BAD_REQUEST" });
    }

    if (req.user?.globalRole === "ADMIN") {
      return next();
    }

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId } },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

const requireProjectAdmin = async (req, res, next) => {
  try {
    const projectId = getProjectId(req);
    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, error: "Project ID missing", code: "BAD_REQUEST" });
    }

    if (req.user?.globalRole === "ADMIN") {
      return next();
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found", code: "NOT_FOUND" });
    }

    if (project.ownerId === req.user.id) {
      return next();
    }

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId } },
    });

    if (membership?.role === "ADMIN") {
      return next();
    }

    return res
      .status(403)
      .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
  } catch (error) {
    return next(error);
  }
};

const getOrgId = (req) => req.params.orgId || req.params.id;

const requireOrgMember = async (req, res, next) => {
  try {
    if (req.user?.globalRole === "ADMIN") return next();
    const orgId = getOrgId(req);
    if (!orgId) {
      return res
        .status(400)
        .json({ success: false, error: "Org ID missing", code: "BAD_REQUEST" });
    }
    const membership = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId: req.user.id, orgId } },
    });
    if (!membership) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }
    req.orgMembership = membership;
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireOrgAdmin = async (req, res, next) => {
  try {
    if (req.user?.globalRole === "ADMIN") return next();
    const orgId = getOrgId(req);
    if (!orgId) {
      return res
        .status(400)
        .json({ success: false, error: "Org ID missing", code: "BAD_REQUEST" });
    }
    const membership = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId: req.user.id, orgId } },
    });
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }
    req.orgMembership = membership;
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireOrgOwner = async (req, res, next) => {
  try {
    if (req.user?.globalRole === "ADMIN") return next();
    const orgId = getOrgId(req);
    if (!orgId) {
      return res
        .status(400)
        .json({ success: false, error: "Org ID missing", code: "BAD_REQUEST" });
    }
    const membership = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId: req.user.id, orgId } },
    });
    if (!membership || membership.role !== "OWNER") {
      return res
        .status(403)
        .json({ success: false, error: "Forbidden", code: "FORBIDDEN" });
    }
    req.orgMembership = membership;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  requireGlobalAdmin,
  requireProjectAccess,
  requireProjectAdmin,
  requireOrgMember,
  requireOrgAdmin,
  requireOrgOwner,
};
