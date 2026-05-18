const express = require("express");

const validate = require("../middleware/validate.middleware");
const authMiddleware = require("../middleware/auth.middleware");
const {
  requireOrgMember,
  requireOrgAdmin,
  requireOrgOwner,
} = require("../middleware/role.middleware");
const {
  orgCreateSchema,
  orgUpdateSchema,
  orgMemberInviteSchema,
  orgMemberRoleSchema,
  departmentCreateSchema,
  departmentUpdateSchema,
  teamCreateSchema,
  teamUpdateSchema,
  teamMemberAddSchema,
} = require("../lib/schemas");
const {
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
} = require("../controllers/orgs.controller");

const router = express.Router();

router.use(authMiddleware);

// Organizations
router.get("/", listMyOrgs);
router.post("/", validate(orgCreateSchema), createOrg);
router.get("/:id", requireOrgMember, getOrg);
router.patch("/:id", requireOrgAdmin, validate(orgUpdateSchema), updateOrg);
router.delete("/:id", requireOrgOwner, deleteOrg);

// Members
router.get("/:id/members", requireOrgMember, listOrgMembers);
router.post(
  "/:id/members",
  requireOrgAdmin,
  validate(orgMemberInviteSchema),
  addOrgMember
);
router.patch(
  "/:id/members/:userId",
  requireOrgAdmin,
  validate(orgMemberRoleSchema),
  updateOrgMemberRole
);
router.delete("/:id/members/:userId", requireOrgAdmin, removeOrgMember);

// Departments
router.get("/:id/departments", requireOrgMember, listDepartments);
router.post(
  "/:id/departments",
  requireOrgAdmin,
  validate(departmentCreateSchema),
  createDepartment
);
router.patch(
  "/:id/departments/:deptId",
  requireOrgAdmin,
  validate(departmentUpdateSchema),
  updateDepartment
);
router.delete("/:id/departments/:deptId", requireOrgAdmin, deleteDepartment);

// Teams
router.get("/:id/teams", requireOrgMember, listTeams);
router.post("/:id/teams", requireOrgAdmin, validate(teamCreateSchema), createTeam);
router.get("/:id/teams/:teamId", requireOrgMember, getTeam);
router.patch(
  "/:id/teams/:teamId",
  requireOrgAdmin,
  validate(teamUpdateSchema),
  updateTeam
);
router.delete("/:id/teams/:teamId", requireOrgAdmin, deleteTeam);
router.post(
  "/:id/teams/:teamId/members",
  requireOrgAdmin,
  validate(teamMemberAddSchema),
  addTeamMember
);
router.delete(
  "/:id/teams/:teamId/members/:userId",
  requireOrgAdmin,
  removeTeamMember
);

module.exports = router;
