const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  taskUpdateSchema,
  taskStatusSchema,
  commentSchema,
  checklistItemSchema,
  checklistItemUpdateSchema,
  taskTagSchema,
  dependencyCreateSchema,
  attachmentCreateSchema,
} = require("../lib/schemas");
const {
  getTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  listOverdueTasks,
  listMyTasks,
  addComment,
} = require("../controllers/tasks.controller");
const {
  listSubtasks,
  listChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  listTaskTags,
  addTaskTag,
  removeTaskTag,
  listDependencies,
  addDependency,
  removeDependency,
  listAttachments,
  createAttachment,
  deleteAttachment,
} = require("../controllers/taskExtras.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", listMyTasks);
router.get("/overdue", listOverdueTasks);
router.get("/:id", getTask);
router.patch("/:id", validate(taskUpdateSchema), updateTask);
router.patch("/:id/status", validate(taskStatusSchema), updateTaskStatus);
router.delete("/:id", deleteTask);
router.post("/:id/comments", validate(commentSchema), addComment);

// Subtasks
router.get("/:id/subtasks", listSubtasks);

// Checklist
router.get("/:id/checklist", listChecklist);
router.post("/:id/checklist", validate(checklistItemSchema), addChecklistItem);
router.patch(
  "/:id/checklist/:itemId",
  validate(checklistItemUpdateSchema),
  updateChecklistItem
);
router.delete("/:id/checklist/:itemId", deleteChecklistItem);

// Tags
router.get("/:id/tags", listTaskTags);
router.post("/:id/tags", validate(taskTagSchema), addTaskTag);
router.delete("/:id/tags/:tagId", removeTaskTag);

// Dependencies
router.get("/:id/dependencies", listDependencies);
router.post(
  "/:id/dependencies",
  validate(dependencyCreateSchema),
  addDependency
);
router.delete("/:id/dependencies/:depId", removeDependency);

// Attachments
router.get("/:id/attachments", listAttachments);
router.post(
  "/:id/attachments",
  validate(attachmentCreateSchema),
  createAttachment
);
router.delete("/:id/attachments/:attachmentId", deleteAttachment);

module.exports = router;
