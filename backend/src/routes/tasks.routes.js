const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { taskUpdateSchema, taskStatusSchema, commentSchema } = require("../lib/schemas");
const {
  getTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  listOverdueTasks,
  listMyTasks,
  addComment,
} = require("../controllers/tasks.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", listMyTasks);
router.get("/overdue", listOverdueTasks);
router.get("/:id", getTask);
router.patch("/:id", validate(taskUpdateSchema), updateTask);
router.patch("/:id/status", validate(taskStatusSchema), updateTaskStatus);
router.delete("/:id", deleteTask);
router.post("/:id/comments", validate(commentSchema), addComment);

module.exports = router;
