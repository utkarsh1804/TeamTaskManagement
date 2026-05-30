const prisma = require("./prisma");

// Shared project access helpers for Phase 5/6 controllers that resolve the
// project from a child entity (where route middleware cannot use req.params.id).

const isProjectMember = async (projectId, userId, globalRole) => {
  if (globalRole === "ADMIN") return true;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) return false;
  if (project.ownerId === userId) return true;
  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  return Boolean(membership);
};

const isProjectAdmin = async (projectId, userId, globalRole) => {
  if (globalRole === "ADMIN") return true;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) return false;
  if (project.ownerId === userId) return true;
  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  return membership?.role === "ADMIN";
};

module.exports = { isProjectMember, isProjectAdmin };
