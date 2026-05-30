const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { requireGlobalAdmin } = require("../middleware/role.middleware");
const { timesheetSubmitSchema, timesheetReviewSchema } = require("../lib/schemas");
const {
  getMyTimesheet,
  listMyTimesheets,
  submitTimesheet,
  listPending,
  reviewTimesheet,
} = require("../controllers/timesheets.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/me", getMyTimesheet);
router.get("/me/history", listMyTimesheets);
router.post("/submit", validate(timesheetSubmitSchema), submitTimesheet);
router.get("/pending", requireGlobalAdmin, listPending);
router.post("/:id/review", requireGlobalAdmin, validate(timesheetReviewSchema), reviewTimesheet);

module.exports = router;
