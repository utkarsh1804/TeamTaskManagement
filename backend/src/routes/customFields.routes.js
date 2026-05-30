const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { requireProjectAccess, requireProjectAdmin } = require("../middleware/role.middleware");
const {
  customFieldCreateSchema,
  customFieldUpdateSchema,
  customFieldValueSchema,
} = require("../lib/schemas");
const {
  listFields,
  createField,
  updateField,
  deleteField,
  getTaskValues,
  setTaskValue,
} = require("../controllers/customFields.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/projects/:id/custom-fields", requireProjectAccess, listFields);
router.post("/projects/:id/custom-fields", requireProjectAdmin, validate(customFieldCreateSchema), createField);
router.patch("/custom-fields/:fieldId", validate(customFieldUpdateSchema), updateField);
router.delete("/custom-fields/:fieldId", deleteField);

router.get("/tasks/:taskId/custom-fields", getTaskValues);
router.put("/tasks/:taskId/custom-fields/:fieldId", validate(customFieldValueSchema), setTaskValue);

module.exports = router;
