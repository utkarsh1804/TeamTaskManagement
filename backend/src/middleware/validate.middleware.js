const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues[0]?.message || "Validation error";
    return res
      .status(422)
      .json({ success: false, error: message, code: "VALIDATION_ERROR" });
  }

  req.body = result.data;
  return next();
};

module.exports = validate;
