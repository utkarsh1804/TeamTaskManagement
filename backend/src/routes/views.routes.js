const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { savedViewCreateSchema, savedViewUpdateSchema } = require("../lib/schemas");
const { listViews, createView, updateView, deleteView } = require("../controllers/views.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/views", listViews);
router.post("/views", validate(savedViewCreateSchema), createView);
router.patch("/views/:viewId", validate(savedViewUpdateSchema), updateView);
router.delete("/views/:viewId", deleteView);

module.exports = router;
