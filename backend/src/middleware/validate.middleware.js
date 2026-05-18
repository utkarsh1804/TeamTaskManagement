const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "root",
      message: issue.message,
    }));
    return res.status(422).json({
      success: false,
      error: errors[0].message,
      errors,
      code: "VALIDATION_ERROR",
    });
  }
  req.body = result.data;
  return next();
};

module.exports = validate;
