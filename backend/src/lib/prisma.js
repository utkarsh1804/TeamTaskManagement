const { PrismaClient } = require("@prisma/client");

const SOFT_DELETE_MODELS = new Set([
  "User",
  "Project",
  "Task",
  "Organization",
  "Department",
  "Team",
]);

const includeSoftDeleteFilter = (args = {}) => {
  if (args.where && Object.prototype.hasOwnProperty.call(args.where, "deletedAt")) {
    return args;
  }
  return { ...args, where: { ...(args.where || {}), deletedAt: null } };
};

const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends({
  name: "soft-delete",
  query: {
    $allModels: {
      async findFirst({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) args = includeSoftDeleteFilter(args);
        return query(args);
      },
      async findFirstOrThrow({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) args = includeSoftDeleteFilter(args);
        return query(args);
      },
      async findMany({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) args = includeSoftDeleteFilter(args);
        return query(args);
      },
      async count({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) args = includeSoftDeleteFilter(args);
        return query(args);
      },
      async aggregate({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) args = includeSoftDeleteFilter(args);
        return query(args);
      },
      async groupBy({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) args = includeSoftDeleteFilter(args);
        return query(args);
      },
      async findUnique({ model, args, query }) {
        const result = await query(args);
        if (
          result &&
          SOFT_DELETE_MODELS.has(model) &&
          Object.prototype.hasOwnProperty.call(result, "deletedAt") &&
          result.deletedAt !== null
        ) {
          return null;
        }
        return result;
      },
      async findUniqueOrThrow({ model, args, query }) {
        const result = await query(args);
        if (
          result &&
          SOFT_DELETE_MODELS.has(model) &&
          Object.prototype.hasOwnProperty.call(result, "deletedAt") &&
          result.deletedAt !== null
        ) {
          const err = new Error(`No ${model} found`);
          err.code = "P2025";
          throw err;
        }
        return result;
      },
    },
  },
  model: {
    $allModels: {
      async softDelete(where) {
        const ctx = this;
        return ctx.update({ where, data: { deletedAt: new Date() } });
      },
      async restore(where) {
        const ctx = this;
        return ctx.update({ where, data: { deletedAt: null } });
      },
    },
  },
});

module.exports = prisma;
module.exports.raw = basePrisma;
