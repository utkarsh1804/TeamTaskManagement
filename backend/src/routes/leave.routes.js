const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { requireGlobalAdmin } = require("../middleware/role.middleware");
const { leaveCreateSchema, leaveReviewSchema } = require("../lib/schemas");
const {
  createLeave,
  listMyLeave,
  cancelLeave,
  listPending,
  reviewLeave,
} = require("../controllers/leave.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/me", listMyLeave);
router.post("/", validate(leaveCreateSchema), createLeave);
router.get("/pending", requireGlobalAdmin, listPending);
router.post("/:id/cancel", cancelLeave);
router.post("/:id/review", requireGlobalAdmin, validate(leaveReviewSchema), reviewLeave);

module.exports = router;
