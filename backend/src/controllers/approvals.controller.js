const prisma = require("../lib/prisma");
const notifications = require("../lib/notifications");
const { isProjectAdmin, isProjectMember } = require("../lib/projectAccess");

const notFound = (res, what) =>
  res.status(404).json({ success: false, error: `${what} not found`, code: "NOT_FOUND" });
const forbidden = (res) =>
  res.status(403).json({ success: false, error: "Forbidden", code: "FORBIDDEN" });

const userSelect = { id: true, name: true, email: true };

const listChains = async (req, res, next) => {
  try {
    const items = await prisma.approvalChain.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
};

const createChain = async (req, res, next) => {
  try {
    const { name, steps } = req.body;
    const chain = await prisma.approvalChain.create({
      data: { projectId: req.params.id, name, steps },
    });
    res.status(201).json({ chain });
  } catch (e) {
    next(e);
  }
};

const deleteChain = async (req, res, next) => {
  try {
    const chain = await prisma.approvalChain.findUnique({ where: { id: req.params.chainId } });
    if (!chain) return notFound(res, "Chain");
    if (!(await isProjectAdmin(chain.projectId, req.user.id, req.user.globalRole))) return forbidden(res);
    await prisma.approvalRequest.deleteMany({ where: { chainId: chain.id } });
    await prisma.approvalChain.delete({ where: { id: chain.id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

const createRequest = async (req, res, next) => {
  try {
    const chain = await prisma.approvalChain.findUnique({ where: { id: req.params.chainId } });
    if (!chain) return notFound(res, "Chain");
    if (!(await isProjectMember(chain.projectId, req.user.id, req.user.globalRole))) return forbidden(res);

    const chainSteps = Array.isArray(chain.steps) ? chain.steps : [];
    if (!chainSteps.length) {
      return res.status(400).json({ success: false, error: "Chain has no steps", code: "BAD_REQUEST" });
    }
    const steps = chainSteps.map((s) => ({
      name: s.name,
      approverId: s.approverId,
      status: "PENDING",
      decidedAt: null,
      decidedBy: null,
      note: null,
    }));

    const request = await prisma.approvalRequest.create({
      data: {
        chainId: chain.id,
        taskId: req.body.taskId ?? null,
        requestedById: req.user.id,
        status: "PENDING",
        currentStep: 0,
        steps,
        note: req.body.note ?? null,
      },
    });

    await notifications.create({
      userId: steps[0].approverId,
      type: notifications.NotificationType.APPROVAL_REQUESTED,
      title: "Approval requested",
      body: `${chain.name} — step "${steps[0].name}" needs your decision`,
      link: `/approvals`,
      meta: { requestId: request.id, chainId: chain.id, taskId: request.taskId },
    });

    res.status(201).json({ request });
  } catch (e) {
    next(e);
  }
};

const listProjectRequests = async (req, res, next) => {
  try {
    const items = await prisma.approvalRequest.findMany({
      where: { chain: { projectId: req.params.id } },
      orderBy: { createdAt: "desc" },
      include: {
        chain: { select: { id: true, name: true } },
        requestedBy: { select: userSelect },
        task: { select: { id: true, title: true } },
      },
    });
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
};

const listMyRequests = async (req, res, next) => {
  try {
    const me = req.user.id;
    const requested = await prisma.approvalRequest.findMany({
      where: { requestedById: me },
      orderBy: { createdAt: "desc" },
      include: {
        chain: { select: { id: true, name: true } },
        requestedBy: { select: userSelect },
        task: { select: { id: true, title: true } },
      },
    });

    const pending = await prisma.approvalRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        chain: { select: { id: true, name: true } },
        requestedBy: { select: userSelect },
        task: { select: { id: true, title: true } },
      },
    });
    const awaitingMe = pending.filter((r) => {
      const step = Array.isArray(r.steps) ? r.steps[r.currentStep] : null;
      return step && step.approverId === me;
    });

    res.json({ requested, awaitingMe });
  } catch (e) {
    next(e);
  }
};

const decide = async (req, res, next) => {
  try {
    const request = await prisma.approvalRequest.findUnique({
      where: { id: req.params.reqId },
      include: { chain: true },
    });
    if (!request) return notFound(res, "Request");
    if (request.status !== "PENDING") {
      return res.status(409).json({ success: false, error: "Already decided", code: "CONFLICT" });
    }

    const steps = Array.isArray(request.steps) ? request.steps : [];
    const idx = request.currentStep;
    const step = steps[idx];
    if (!step) {
      return res.status(400).json({ success: false, error: "Invalid step", code: "BAD_REQUEST" });
    }

    const isApprover = req.user.id === step.approverId;
    const isAdmin = req.user.globalRole === "ADMIN";
    if (!isApprover && !isAdmin) return forbidden(res);

    const { decision, note } = req.body;
    step.status = decision;
    step.decidedAt = new Date().toISOString();
    step.decidedBy = req.user.id;
    step.note = note ?? null;

    let status = request.status;
    let currentStep = idx;
    if (decision === "REJECTED") {
      status = "REJECTED";
    } else if (idx + 1 < steps.length) {
      currentStep = idx + 1;
    } else {
      status = "APPROVED";
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: request.id },
      data: { steps, status, currentStep },
    });

    if (status === "PENDING") {
      await notifications.create({
        userId: steps[currentStep].approverId,
        type: notifications.NotificationType.APPROVAL_REQUESTED,
        title: "Approval requested",
        body: `${request.chain.name} — step "${steps[currentStep].name}" needs your decision`,
        link: `/approvals`,
        meta: { requestId: request.id },
      });
    } else {
      await notifications.create({
        userId: request.requestedById,
        type: notifications.NotificationType.APPROVAL_DECIDED,
        title: `Approval ${status.toLowerCase()}`,
        body: `${request.chain.name} was ${status.toLowerCase()}`,
        link: `/approvals`,
        meta: { requestId: request.id, status },
      });
    }

    res.json({ request: updated });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  listChains,
  createChain,
  deleteChain,
  createRequest,
  listProjectRequests,
  listMyRequests,
  decide,
};
