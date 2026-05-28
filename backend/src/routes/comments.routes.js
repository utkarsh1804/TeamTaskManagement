const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { commentUpdateSchema } = require("../lib/schemas");
const {
  updateComment,
  deleteComment,
} = require("../controllers/comments.controller");

const router = express.Router();

router.use(authMiddleware);

router.patch("/:commentId", validate(commentUpdateSchema), updateComment);
router.delete("/:commentId", deleteComment);

module.exports = router;
