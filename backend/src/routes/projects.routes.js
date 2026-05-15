const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  requireGlobalAdmin,
  requireProjectAccess,
  requireProjectAdmin,
} = require("../middleware/role.middleware");
const {
  projectCreateSchema,
  projectUpdateSchema,
  memberInviteSchema,
  memberRoleSchema,
  taskCreateSchema,
} = require("../lib/schemas");
const {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  updateMemberRole,
  removeMember,
} = require("../controllers/projects.controller");
const { listProjectTasks, createTask } = require("../controllers/tasks.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", listProjects);
router.post("/", requireGlobalAdmin, validate(projectCreateSchema), createProject);
router.get("/:id", requireProjectAccess, getProject);
router.patch("/:id", requireProjectAdmin, validate(projectUpdateSchema), updateProject);
router.delete("/:id", requireGlobalAdmin, deleteProject);

router.post(
  "/:id/members",
  requireProjectAdmin,
  validate(memberInviteSchema),
  addMember
);
router.patch(
  "/:id/members/:userId",
  requireProjectAdmin,
  validate(memberRoleSchema),
  updateMemberRole
);
router.delete("/:id/members/:userId", requireProjectAdmin, removeMember);

router.get("/:id/tasks", requireProjectAccess, listProjectTasks);
router.post(
  "/:id/tasks",
  requireProjectAccess,
  validate(taskCreateSchema),
  createTask
);

module.exports = router;
