const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { requireProjectAccess, requireProjectAdmin } = require("../middleware/role.middleware");
const { sprintCreateSchema, sprintUpdateSchema, sprintTasksSchema } = require("../lib/schemas");
const {
  listSprints,
  createSprint,
  updateSprint,
  deleteSprint,
  assignTasks,
  removeTask,
  getBurndown,
} = require("../controllers/sprints.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/projects/:id/sprints", requireProjectAccess, listSprints);
router.post("/projects/:id/sprints", requireProjectAdmin, validate(sprintCreateSchema), createSprint);

router.patch("/sprints/:id", validate(sprintUpdateSchema), updateSprint);
router.delete("/sprints/:id", deleteSprint);
router.post("/sprints/:id/tasks", validate(sprintTasksSchema), assignTasks);
router.delete("/sprints/:id/tasks/:taskId", removeTask);
router.get("/sprints/:id/burndown", getBurndown);

module.exports = router;
