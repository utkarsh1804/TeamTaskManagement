const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { timerStartSchema, manualTimeEntrySchema, timeEntryUpdateSchema } = require("../lib/schemas");
const {
  startTimer,
  stopTimer,
  addManualEntry,
  listTaskTime,
  getRunning,
  listMyTime,
  updateEntry,
  deleteEntry,
} = require("../controllers/time.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/me/timer", getRunning);
router.get("/me/time", listMyTime);

router.get("/tasks/:id/time", listTaskTime);
router.post("/tasks/:id/time", validate(manualTimeEntrySchema), addManualEntry);
router.post("/tasks/:id/time/start", validate(timerStartSchema), startTimer);
router.post("/tasks/:id/time/stop", stopTimer);

router.patch("/time/:entryId", validate(timeEntryUpdateSchema), updateEntry);
router.delete("/time/:entryId", deleteEntry);

module.exports = router;
