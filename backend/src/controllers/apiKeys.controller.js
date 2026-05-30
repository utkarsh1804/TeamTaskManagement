const prisma = require("../lib/prisma");
const { generateKey } = require("../lib/apiKeyAuth");

const publicSelect = {
  id: true,
  name: true,
  prefix: true,
  scopes: true,
  lastUsedAt: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
};

const listKeys = async (req, res, next) => {
  try {
    const items = await prisma.apiKey.findMany({
      where: { userId: req.user.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: publicSelect,
    });
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
};

const createKey = async (req, res, next) => {
  try {
    const { name, scopes, expiresAt } = req.body;
    const { raw, keyHash, prefix } = generateKey();
    const key = await prisma.apiKey.create({
      data: {
        userId: req.user.id,
        name,
        keyHash,
        prefix,
        scopes: scopes && scopes.length ? scopes : ["read", "write"],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: publicSelect,
    });
    // The raw secret is returned ONCE and never stored in plaintext.
    res.status(201).json({ key, secret: raw });
  } catch (e) {
    next(e);
  }
};

const revokeKey = async (req, res, next) => {
  try {
    const key = await prisma.apiKey.findUnique({ where: { id: req.params.keyId } });
    if (!key || key.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: "Key not found", code: "NOT_FOUND" });
    }
    await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

module.exports = { listKeys, createKey, revokeKey };
