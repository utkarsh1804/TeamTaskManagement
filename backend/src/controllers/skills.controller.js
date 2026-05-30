const prisma = require("../lib/prisma");

const userSelect = { id: true, name: true, email: true };

const listSkills = async (_req, res, next) => {
  try {
    const skills = await prisma.skill.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
    res.json({ items: skills, total: skills.length });
  } catch (error) {
    next(error);
  }
};

const createSkill = async (req, res, next) => {
  try {
    const name = req.body.name.trim();
    const category = req.body.category?.trim() || null;
    const skill = await prisma.skill.upsert({
      where: { name },
      update: { category },
      create: { name, category },
    });
    res.status(201).json({ skill });
  } catch (error) {
    next(error);
  }
};

const listMySkills = async (req, res, next) => {
  try {
    const items = await prisma.userSkill.findMany({
      where: { userId: req.user.id },
      include: { skill: true },
      orderBy: { skill: { name: "asc" } },
    });
    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
};

const setMySkill = async (req, res, next) => {
  try {
    const { skillId, level } = req.body;
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) return res.status(404).json({ success: false, error: "Skill not found", code: "NOT_FOUND" });

    const userSkill = await prisma.userSkill.upsert({
      where: { userId_skillId: { userId: req.user.id, skillId } },
      update: { level },
      create: { userId: req.user.id, skillId, level },
      include: { skill: true },
    });
    res.json({ userSkill });
  } catch (error) {
    next(error);
  }
};

const removeMySkill = async (req, res, next) => {
  try {
    const { skillId } = req.params;
    await prisma.userSkill.deleteMany({ where: { userId: req.user.id, skillId } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const getMatrix = async (req, res, next) => {
  try {
    const [skills, users] = await Promise.all([
      prisma.skill.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
      prisma.user.findMany({
        select: { ...userSelect, jobTitle: true, userSkills: { select: { skillId: true, level: true } } },
        orderBy: { name: "asc" },
        take: 200,
      }),
    ]);
    res.json({ skills, users, total: users.length });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listSkills,
  createSkill,
  listMySkills,
  setMySkill,
  removeMySkill,
  getMatrix,
};
