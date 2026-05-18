const prisma = require("../lib/prisma");
const { logActivity } = require("../lib/activityLog");
const notifications = require("../lib/notifications");

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  jobTitle: true,
};

const orgInclude = {
  _count: { select: { members: true, departments: true, teams: true, projects: true } },
};

// ---------------- Organizations ----------------

const listMyOrgs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const memberships = await prisma.orgMember.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      include: {
        org: {
          include: orgInclude,
        },
      },
    });
    res.json({
      items: memberships.map((m) => ({
        ...m.org,
        myRole: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const createOrg = async (req, res, next) => {
  try {
    const { name, slug, description, logoUrl } = req.body;

    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: "Slug already in use", code: "SLUG_TAKEN" });
    }

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        description: description || null,
        logoUrl: logoUrl || null,
        members: {
          create: { userId: req.user.id, role: "OWNER" },
        },
      },
      include: orgInclude,
    });

    await logActivity(
      `Created organization "${org.name}"`,
      "Organization",
      org.id,
      req.user.id,
      null,
      { slug: org.slug }
    );

    res.status(201).json({ org });
  } catch (error) {
    next(error);
  }
};

const getOrg = async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: {
        ...orgInclude,
        members: {
          take: 50,
          include: { user: { select: userSelect } },
          orderBy: { joinedAt: "desc" },
        },
      },
    });
    if (!org) {
      return res
        .status(404)
        .json({ success: false, error: "Org not found", code: "NOT_FOUND" });
    }
    res.json({ org, myRole: req.orgMembership?.role || null });
  } catch (error) {
    next(error);
  }
};

const updateOrg = async (req, res, next) => {
  try {
    const updated = await prisma.organization.update({
      where: { id: req.params.id },
      data: req.body,
      include: orgInclude,
    });
    await logActivity(
      `Updated organization "${updated.name}"`,
      "Organization",
      updated.id,
      req.user.id
    );
    res.json({ org: updated });
  } catch (error) {
    next(error);
  }
};

const deleteOrg = async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({ where: { id: req.params.id } });
    if (!org) {
      return res
        .status(404)
        .json({ success: false, error: "Org not found", code: "NOT_FOUND" });
    }
    await prisma.organization.update({
      where: { id: org.id },
      data: { deletedAt: new Date() },
    });
    await logActivity(
      `Deleted organization "${org.name}"`,
      "Organization",
      org.id,
      req.user.id
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ---------------- Org Members ----------------

const listOrgMembers = async (req, res, next) => {
  try {
    const members = await prisma.orgMember.findMany({
      where: { orgId: req.params.id },
      include: { user: { select: userSelect } },
      orderBy: { joinedAt: "desc" },
    });
    res.json({ items: members });
  } catch (error) {
    next(error);
  }
};

const addOrgMember = async (req, res, next) => {
  try {
    const orgId = req.params.id;
    const { email, role } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "User not found", code: "NOT_FOUND" });
    }

    const existing = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId: user.id, orgId } },
    });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: "Already a member", code: "CONFLICT" });
    }

    const membership = await prisma.orgMember.create({
      data: { orgId, userId: user.id, role },
      include: { user: { select: userSelect } },
    });

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    await notifications.create({
      userId: user.id,
      type: notifications.NotificationType.ORG_MEMBER_ADDED,
      title: `You were added to "${org?.name}"`,
      body: `Role: ${role}`,
      link: `/orgs/${orgId}`,
      meta: { orgId, role },
    });

    await logActivity(
      `Added ${user.name} to org as ${role}`,
      "OrgMember",
      membership.id,
      req.user.id,
      null,
      { orgId }
    );

    res.status(201).json({ member: membership });
  } catch (error) {
    next(error);
  }
};

const updateOrgMemberRole = async (req, res, next) => {
  try {
    const orgId = req.params.id;
    const { userId } = req.params;
    const { role } = req.body;

    const target = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!target) {
      return res
        .status(404)
        .json({ success: false, error: "Member not found", code: "NOT_FOUND" });
    }

    if (target.role === "OWNER" && role !== "OWNER") {
      const owners = await prisma.orgMember.count({
        where: { orgId, role: "OWNER" },
      });
      if (owners <= 1) {
        return res.status(400).json({
          success: false,
          error: "Cannot demote the last owner",
          code: "LAST_OWNER",
        });
      }
    }

    const updated = await prisma.orgMember.update({
      where: { id: target.id },
      data: { role },
      include: { user: { select: userSelect } },
    });

    res.json({ member: updated });
  } catch (error) {
    next(error);
  }
};

const removeOrgMember = async (req, res, next) => {
  try {
    const orgId = req.params.id;
    const { userId } = req.params;

    const target = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!target) {
      return res
        .status(404)
        .json({ success: false, error: "Member not found", code: "NOT_FOUND" });
    }

    if (target.role === "OWNER") {
      const owners = await prisma.orgMember.count({ where: { orgId, role: "OWNER" } });
      if (owners <= 1) {
        return res.status(400).json({
          success: false,
          error: "Cannot remove the last owner",
          code: "LAST_OWNER",
        });
      }
    }

    await prisma.orgMember.delete({ where: { id: target.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ---------------- Departments ----------------

const listDepartments = async (req, res, next) => {
  try {
    const items = await prisma.department.findMany({
      where: { orgId: req.params.id },
      include: {
        _count: { select: { users: true, teams: true, projects: true } },
        parent: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const dept = await prisma.department.create({
      data: { ...req.body, orgId: req.params.id },
    });
    res.status(201).json({ department: dept });
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const dept = await prisma.department.update({
      where: { id: req.params.deptId },
      data: req.body,
    });
    res.json({ department: dept });
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    await prisma.department.update({
      where: { id: req.params.deptId },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ---------------- Teams ----------------

const listTeams = async (req, res, next) => {
  try {
    const items = await prisma.team.findMany({
      where: { orgId: req.params.id },
      include: {
        _count: { select: { members: true, projects: true } },
        department: { select: { id: true, name: true } },
        leader: { select: userSelect },
      },
      orderBy: { name: "asc" },
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

const createTeam = async (req, res, next) => {
  try {
    const team = await prisma.team.create({
      data: { ...req.body, orgId: req.params.id },
      include: {
        department: { select: { id: true, name: true } },
        leader: { select: userSelect },
      },
    });
    res.status(201).json({ team });
  } catch (error) {
    next(error);
  }
};

const getTeam = async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.teamId },
      include: {
        department: { select: { id: true, name: true } },
        leader: { select: userSelect },
        members: { include: { user: { select: userSelect } } },
        projects: { select: { id: true, name: true, status: true } },
      },
    });
    if (!team) {
      return res
        .status(404)
        .json({ success: false, error: "Team not found", code: "NOT_FOUND" });
    }
    res.json({ team });
  } catch (error) {
    next(error);
  }
};

const updateTeam = async (req, res, next) => {
  try {
    const team = await prisma.team.update({
      where: { id: req.params.teamId },
      data: req.body,
      include: {
        department: { select: { id: true, name: true } },
        leader: { select: userSelect },
      },
    });
    res.json({ team });
  } catch (error) {
    next(error);
  }
};

const deleteTeam = async (req, res, next) => {
  try {
    await prisma.team.update({
      where: { id: req.params.teamId },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const addTeamMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const teamId = req.params.teamId;

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: "Already a team member", code: "CONFLICT" });
    }

    const member = await prisma.teamMember.create({
      data: { teamId, userId },
      include: { user: { select: userSelect } },
    });

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true, orgId: true },
    });

    await notifications.create({
      userId,
      type: notifications.NotificationType.TEAM_MEMBER_ADDED,
      title: `Added to team "${team?.name}"`,
      link: `/orgs/${team?.orgId}/teams/${teamId}`,
      meta: { teamId, orgId: team?.orgId },
    });

    res.status(201).json({ member });
  } catch (error) {
    next(error);
  }
};

const removeTeamMember = async (req, res, next) => {
  try {
    const { teamId, userId } = req.params;
    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, error: "Member not found", code: "NOT_FOUND" });
    }
    await prisma.teamMember.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listMyOrgs,
  createOrg,
  getOrg,
  updateOrg,
  deleteOrg,
  listOrgMembers,
  addOrgMember,
  updateOrgMemberRole,
  removeOrgMember,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listTeams,
  createTeam,
  getTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
};
