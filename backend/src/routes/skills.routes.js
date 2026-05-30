const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { skillCreateSchema, userSkillSchema } = require("../lib/schemas");
const {
  listSkills,
  createSkill,
  listMySkills,
  setMySkill,
  removeMySkill,
  getMatrix,
} = require("../controllers/skills.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", listSkills);
router.post("/", validate(skillCreateSchema), createSkill);
router.get("/matrix", getMatrix);
router.get("/me", listMySkills);
router.put("/me", validate(userSkillSchema), setMySkill);
router.delete("/me/:skillId", removeMySkill);

module.exports = router;
