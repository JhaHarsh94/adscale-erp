import { ApprovalStatus, ApprovalStepStatus, ApprovalType, type Prisma } from "@prisma/client";
import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";

const clean = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str || null;
};
const enumValue = <T extends Record<string, string>>(values: T, value: unknown, fallback: T[keyof T]) =>
  Object.values(values).includes(String(value)) ? String(value) as T[keyof T] : fallback;

const employeeSelect = { id: true, employeeCode: true, user: { select: { name: true, email: true } } };

const approvalInclude: Prisma.ApprovalInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  steps: {
    include: { reviewer: { select: employeeSelect } },
    orderBy: { stepOrder: "asc" },
  },
  comments: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  },
  files: {
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  },
};

async function approval(id: string) {
  const result = await prisma.approval.findUnique({ where: { id }, include: approvalInclude });
  if (!result) throw new AppError("Approval request not found", 404);
  return result;
}

/* Dashboard */
export const dashboard = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const employee = await prisma.employee.findUnique({ where: { userId: user?.id } });
  const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");

  const [total, pending, inReview, approved, rejected, myRequests, pendingMyReview] = await Promise.all([
    prisma.approval.count(),
    prisma.approval.count({ where: { status: "PENDING" } }),
    prisma.approval.count({ where: { status: "IN_REVIEW" } }),
    prisma.approval.count({ where: { status: "APPROVED" } }),
    prisma.approval.count({ where: { status: "REJECTED" } }),
    prisma.approval.count({ where: { createdById: user?.id } }),
    employee ? prisma.approvalStep.count({ where: { reviewerId: employee.id, status: "PENDING" } }) : Promise.resolve(0),
  ]);

  return successResponse(res, 200, "Approval dashboard", { total, pending, inReview, approved, rejected, myRequests, pendingMyReview });
});

/* List */
export const list = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const employee = await prisma.employee.findUnique({ where: { userId: user?.id } });
  const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
  const where: Prisma.ApprovalWhereInput = {};

  if (!isAgent && user) where.createdById = user.id;
  if (req.query.status) where.status = enumValue(ApprovalStatus, req.query.status, ApprovalStatus.PENDING);
  if (req.query.type) where.type = enumValue(ApprovalType, req.query.type, ApprovalType.OTHER);

  const approvals = await prisma.approval.findMany({ where, include: approvalInclude, orderBy: { createdAt: "desc" } });
  return successResponse(res, 200, "Approvals fetched", approvals);
});

/* Pending my review */
export const pendingReview = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const employee = await prisma.employee.findUnique({ where: { userId: user?.id } });
  if (!employee) throw new AppError("Employee profile not found", 404);

  const steps = await prisma.approvalStep.findMany({
    where: { reviewerId: employee.id, status: "PENDING" },
    include: {
      approval: { include: approvalInclude },
    },
    orderBy: { createdAt: "desc" },
  });
  const approvals = steps.map((s) => s.approval);
  return successResponse(res, 200, "Pending approvals fetched", approvals);
});

/* Get one */
export const getOne = asyncHandler(async (req, res) => successResponse(res, 200, "Approval fetched", await approval(req.params.id)));

/* Create */
export const create = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const title = clean(req.body.title);
  if (!title) throw new AppError("Title is required", 400);

  const type = enumValue(ApprovalType, req.body.type, ApprovalType.OTHER);
  const status = ApprovalStatus.PENDING;

  const result = await prisma.approval.create({
    data: {
      title,
      description: clean(req.body.description),
      type,
      priority: String(req.body.priority || "MEDIUM"),
      createdBy: { connect: { id: user?.id } },
      steps: {
        create: (req.body.steps || []).map((step: { reviewerId: string; stepOrder?: number }, idx: number) => ({
          stepOrder: step.stepOrder ?? idx + 1,
          reviewerId: step.reviewerId,
          status: ApprovalStepStatus.PENDING,
        })),
      },
    },
    include: approvalInclude,
  });
  return successResponse(res, 201, "Approval request created", result);
});

/* Update */
export const update = asyncHandler(async (req, res) => {
  const current = await approval(req.params.id);
  if (current.status !== "PENDING") throw new AppError("Can only update pending approvals", 400);

  const data: Prisma.ApprovalUpdateInput = {};
  if (req.body.title) data.title = clean(req.body.title)!;
  if (req.body.description !== undefined) data.description = clean(req.body.description) || undefined;
  if (req.body.type) data.type = enumValue(ApprovalType, req.body.type, current.type);
  if (req.body.priority) data.priority = String(req.body.priority);

  const result = await prisma.approval.update({ where: { id: req.params.id }, data, include: approvalInclude });
  return successResponse(res, 200, "Approval updated", result);
});

/* Delete */
export const remove = asyncHandler(async (req, res) => {
  await approval(req.params.id);
  await prisma.approval.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, "Approval deleted");
});

/* Cancel */
export const cancel = asyncHandler(async (req, res) => {
  const current = await approval(req.params.id);
  if (current.status === "APPROVED" || current.status === "REJECTED" || current.status === "CANCELLED") {
    throw new AppError("Cannot cancel an already finalized approval", 400);
  }
  const result = await prisma.approval.update({
    where: { id: req.params.id },
    data: { status: "CANCELLED" },
    include: approvalInclude,
  });
  return successResponse(res, 200, "Approval cancelled", result);
});

/* Act on step (approve/reject) */
export const actOnStep = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const employee = await prisma.employee.findUnique({ where: { userId: user?.id } });
  if (!employee) throw new AppError("Employee profile not found", 404);

  const step = await prisma.approvalStep.findUnique({ where: { id: req.params.stepId } });
  if (!step) throw new AppError("Step not found", 404);
  if (step.reviewerId !== employee.id) throw new AppError("You are not the reviewer for this step", 403);
  if (step.status !== "PENDING") throw new AppError("Step has already been acted upon", 400);

  const action = clean(req.body.action);
  if (!action || !["APPROVED", "REJECTED"].includes(action)) throw new AppError("Action must be APPROVED or REJECTED", 400);

  const newStatus = action as ApprovalStepStatus;

  const updatedStep = await prisma.approvalStep.update({
    where: { id: req.params.stepId },
    data: {
      status: newStatus,
      comments: clean(req.body.comments),
      actedAt: new Date(),
    },
  });

  if (newStatus === "REJECTED") {
    await prisma.approval.update({
      where: { id: step.approvalId },
      data: { status: "REJECTED" },
    });
  } else {
    const remainingPending = await prisma.approvalStep.count({
      where: { approvalId: step.approvalId, status: "PENDING" },
    });
    if (remainingPending === 0) {
      await prisma.approval.update({
        where: { id: step.approvalId },
        data: { status: "APPROVED" },
      });
    } else {
      await prisma.approval.update({
        where: { id: step.approvalId },
        data: { status: "IN_REVIEW" },
      });
    }
  }

  const result = await approval(step.approvalId);
  return successResponse(res, 200, `Step ${newStatus === "APPROVED" ? "approved" : "rejected"}`, result);
});

/* Request revisions */
export const requestRevisions = asyncHandler(async (req, res) => {
  const current = await approval(req.params.id);
  if (current.status === "APPROVED" || current.status === "REJECTED" || current.status === "CANCELLED") {
    throw new AppError("Cannot request revisions on a finalized approval", 400);
  }
  const result = await prisma.approval.update({
    where: { id: req.params.id },
    data: { status: "REVISIONS_REQUESTED" },
    include: approvalInclude,
  });
  return successResponse(res, 200, "Revisions requested", result);
});

/* Submit after revisions (back to pending) */
export const resubmit = asyncHandler(async (req, res) => {
  const current = await approval(req.params.id);
  if (current.status !== "REVISIONS_REQUESTED") throw new AppError("Only approvals with revisions requested can be resubmitted", 400);
  const result = await prisma.approval.update({
    where: { id: req.params.id },
    data: { status: "PENDING" },
    include: approvalInclude,
  });
  return successResponse(res, 200, "Approval resubmitted", result);
});

/* Comments */
export const commentsCreate = asyncHandler(async (req, res) => {
  await approval(req.params.id);
  const body = clean(req.body.body);
  if (!body) throw new AppError("Comment body is required", 400);
  const user = (req as AuthRequest).user;
  const comment = await prisma.approvalComment.create({
    data: { approvalId: req.params.id, userId: user?.id, body },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return successResponse(res, 201, "Comment added", comment);
});

/* Add step */
export const addStep = asyncHandler(async (req, res) => {
  await approval(req.params.id);
  if (!req.body.reviewerId) throw new AppError("reviewerId is required", 400);
  const maxStep = await prisma.approvalStep.aggregate({ where: { approvalId: req.params.id }, _max: { stepOrder: true } });
  const step = await prisma.approvalStep.create({
    data: {
      approvalId: req.params.id,
      stepOrder: (maxStep._max.stepOrder ?? 0) + 1,
      reviewerId: req.body.reviewerId,
    },
    include: { reviewer: { select: employeeSelect } },
  });
  return successResponse(res, 201, "Step added", step);
});
