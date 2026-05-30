const crypto = require("crypto");
const prisma = require("./prisma");

const hashKey = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

// Generates a new API key. Returns { raw, keyHash, prefix }. The raw value is
// shown to the user exactly once; only the hash is stored.
const generateKey = () => {
  const raw = "tk_" + crypto.randomBytes(24).toString("hex");
  return { raw, keyHash: hashKey(raw), prefix: raw.slice(0, 10) };
};

// Authenticates a request via API key (X-API-Key header or Bearer token).
// Populates req.user (id, globalRole) and req.apiKey (id, scopes).
const apiKeyAuth = async (req, res, next) => {
  try {
    let raw = req.headers["x-api-key"];
    if (!raw && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      raw = req.headers.authorization.slice(7);
    }
    if (!raw) {
      return res.status(401).json({ success: false, error: "API key required", code: "UNAUTHORIZED" });
    }

    const key = await prisma.apiKey.findUnique({
      where: { keyHash: hashKey(raw) },
      include: { user: { select: { id: true, globalRole: true, name: true, email: true } } },
    });

    if (!key || key.revokedAt || (key.expiresAt && key.expiresAt < new Date()) || !key.user) {
      return res.status(401).json({ success: false, error: "Invalid API key", code: "UNAUTHORIZED" });
    }

    await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

    req.user = { id: key.user.id, globalRole: key.user.globalRole, name: key.user.name, email: key.user.email };
    req.apiKey = { id: key.id, scopes: Array.isArray(key.scopes) && key.scopes.length ? key.scopes : ["read", "write"] };
    next();
  } catch (e) {
    next(e);
  }
};

const requireScope = (scope) => (req, res, next) => {
  if (req.user?.globalRole === "ADMIN") return next();
  const scopes = req.apiKey?.scopes || [];
  if (scopes.includes(scope)) return next();
  return res.status(403).json({ success: false, error: `Missing scope: ${scope}`, code: "FORBIDDEN" });
};

module.exports = { apiKeyAuth, requireScope, generateKey, hashKey };
