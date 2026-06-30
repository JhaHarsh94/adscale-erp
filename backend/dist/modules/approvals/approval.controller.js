"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addStep = exports.commentsCreate = exports.resubmit = exports.requestRevisions = exports.actOnStep = exports.cancel = exports.remove = exports.update = exports.create = exports.getOne = exports.pendingReview = exports.list = exports.dashboard = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const AppError_1 = require("../../utils/AppError");
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const clean = (value) => {
    if (value === null || value === undefined)
        return null;
    const str = String(value).trim();
    return str || null;
};
const enumValue = (values, value, fallback) => Object.values(values).includes(String(value)) ? String(value) : fallback;
const employeeSelect = { id: true, employeeCode: true, user: { select: { name: true, email: true } } };
const approvalInclude = {
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
async function approval(id) {
    const result = await prisma_1.default.approval.findUnique({ where: { id }, include: approvalInclude });
    if (!result)
        throw new AppError_1.AppError("Approval request not found", 404);
    return result;
}
/* Dashboard */
exports.dashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const employee = await prisma_1.default.employee.findUnique({ where: { userId: user?.id } });
    const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
    const [total, pending, inReview, approved, rejected, myRequests, pendingMyReview] = await Promise.all([
        prisma_1.default.approval.count(),
        prisma_1.default.approval.count({ where: { status: "PENDING" } }),
        prisma_1.default.approval.count({ where: { status: "IN_REVIEW" } }),
        prisma_1.default.approval.count({ where: { status: "APPROVED" } }),
        prisma_1.default.approval.count({ where: { status: "REJECTED" } }),
        prisma_1.default.approval.count({ where: { createdById: user?.id } }),
        employee ? prisma_1.default.approvalStep.count({ where: { reviewerId: employee.id, status: "PENDING" } }) : Promise.resolve(0),
    ]);
    return (0, response_1.successResponse)(res, 200, "Approval dashboard", { total, pending, inReview, approved, rejected, myRequests, pendingMyReview });
});
/* List */
exports.list = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const employee = await prisma_1.default.employee.findUnique({ where: { userId: user?.id } });
    const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
    const where = {};
    if (!isAgent && user)
        where.createdById = user.id;
    if (req.query.status)
        where.status = enumValue(client_1.ApprovalStatus, req.query.status, client_1.ApprovalStatus.PENDING);
    if (req.query.type)
        where.type = enumValue(client_1.ApprovalType, req.query.type, client_1.ApprovalType.OTHER);
    const approvals = await prisma_1.default.approval.findMany({ where, include: approvalInclude, orderBy: { createdAt: "desc" } });
    return (0, response_1.successResponse)(res, 200, "Approvals fetched", approvals);
});
/* Pending my review */
exports.pendingReview = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const employee = await prisma_1.default.employee.findUnique({ where: { userId: user?.id } });
    if (!employee)
        throw new AppError_1.AppError("Employee profile not found", 404);
    const steps = await prisma_1.default.approvalStep.findMany({
        where: { reviewerId: employee.id, status: "PENDING" },
        include: {
            approval: { include: approvalInclude },
        },
        orderBy: { createdAt: "desc" },
    });
    const approvals = steps.map((s) => s.approval);
    return (0, response_1.successResponse)(res, 200, "Pending approvals fetched", approvals);
});
/* Get one */
exports.getOne = (0, asyncHandler_1.asyncHandler)(async (req, res) => (0, response_1.successResponse)(res, 200, "Approval fetched", await approval(req.params.id)));
/* Create */
exports.create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const title = clean(req.body.title);
    if (!title)
        throw new AppError_1.AppError("Title is required", 400);
    const type = enumValue(client_1.ApprovalType, req.body.type, client_1.ApprovalType.OTHER);
    const status = client_1.ApprovalStatus.PENDING;
    const result = await prisma_1.default.approval.create({
        data: {
            title,
            description: clean(req.body.description),
            type,
            priority: String(req.body.priority || "MEDIUM"),
            createdBy: { connect: { id: user?.id } },
            steps: {
                create: (req.body.steps || []).map((step, idx) => ({
                    stepOrder: step.stepOrder ?? idx + 1,
                    reviewerId: step.reviewerId,
                    status: client_1.ApprovalStepStatus.PENDING,
                })),
            },
        },
        include: approvalInclude,
    });
    return (0, response_1.successResponse)(res, 201, "Approval request created", result);
});
/* Update */
exports.update = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await approval(req.params.id);
    if (current.status !== "PENDING")
        throw new AppError_1.AppError("Can only update pending approvals", 400);
    const data = {};
    if (req.body.title)
        data.title = clean(req.body.title);
    if (req.body.description !== undefined)
        data.description = clean(req.body.description) || undefined;
    if (req.body.type)
        data.type = enumValue(client_1.ApprovalType, req.body.type, current.type);
    if (req.body.priority)
        data.priority = String(req.body.priority);
    const result = await prisma_1.default.approval.update({ where: { id: req.params.id }, data, include: approvalInclude });
    return (0, response_1.successResponse)(res, 200, "Approval updated", result);
});
/* Delete */
exports.remove = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await approval(req.params.id);
    await prisma_1.default.approval.delete({ where: { id: req.params.id } });
    return (0, response_1.successResponse)(res, 200, "Approval deleted");
});
/* Cancel */
exports.cancel = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await approval(req.params.id);
    if (current.status === "APPROVED" || current.status === "REJECTED" || current.status === "CANCELLED") {
        throw new AppError_1.AppError("Cannot cancel an already finalized approval", 400);
    }
    const result = await prisma_1.default.approval.update({
        where: { id: req.params.id },
        data: { status: "CANCELLED" },
        include: approvalInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Approval cancelled", result);
});
/* Act on step (approve/reject) */
exports.actOnStep = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const employee = await prisma_1.default.employee.findUnique({ where: { userId: user?.id } });
    if (!employee)
        throw new AppError_1.AppError("Employee profile not found", 404);
    const step = await prisma_1.default.approvalStep.findUnique({ where: { id: req.params.stepId } });
    if (!step)
        throw new AppError_1.AppError("Step not found", 404);
    if (step.reviewerId !== employee.id)
        throw new AppError_1.AppError("You are not the reviewer for this step", 403);
    if (step.status !== "PENDING")
        throw new AppError_1.AppError("Step has already been acted upon", 400);
    const action = clean(req.body.action);
    if (!action || !["APPROVED", "REJECTED"].includes(action))
        throw new AppError_1.AppError("Action must be APPROVED or REJECTED", 400);
    const newStatus = action;
    const updatedStep = await prisma_1.default.approvalStep.update({
        where: { id: req.params.stepId },
        data: {
            status: newStatus,
            comments: clean(req.body.comments),
            actedAt: new Date(),
        },
    });
    if (newStatus === "REJECTED") {
        await prisma_1.default.approval.update({
            where: { id: step.approvalId },
            data: { status: "REJECTED" },
        });
    }
    else {
        const remainingPending = await prisma_1.default.approvalStep.count({
            where: { approvalId: step.approvalId, status: "PENDING" },
        });
        if (remainingPending === 0) {
            await prisma_1.default.approval.update({
                where: { id: step.approvalId },
                data: { status: "APPROVED" },
            });
        }
        else {
            await prisma_1.default.approval.update({
                where: { id: step.approvalId },
                data: { status: "IN_REVIEW" },
            });
        }
    }
    const result = await approval(step.approvalId);
    return (0, response_1.successResponse)(res, 200, `Step ${newStatus === "APPROVED" ? "approved" : "rejected"}`, result);
});
/* Request revisions */
exports.requestRevisions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await approval(req.params.id);
    if (current.status === "APPROVED" || current.status === "REJECTED" || current.status === "CANCELLED") {
        throw new AppError_1.AppError("Cannot request revisions on a finalized approval", 400);
    }
    const result = await prisma_1.default.approval.update({
        where: { id: req.params.id },
        data: { status: "REVISIONS_REQUESTED" },
        include: approvalInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Revisions requested", result);
});
/* Submit after revisions (back to pending) */
exports.resubmit = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await approval(req.params.id);
    if (current.status !== "REVISIONS_REQUESTED")
        throw new AppError_1.AppError("Only approvals with revisions requested can be resubmitted", 400);
    const result = await prisma_1.default.approval.update({
        where: { id: req.params.id },
        data: { status: "PENDING" },
        include: approvalInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Approval resubmitted", result);
});
/* Comments */
exports.commentsCreate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await approval(req.params.id);
    const body = clean(req.body.body);
    if (!body)
        throw new AppError_1.AppError("Comment body is required", 400);
    const user = req.user;
    const comment = await prisma_1.default.approvalComment.create({
        data: { approvalId: req.params.id, userId: user?.id, body },
        include: { user: { select: { id: true, name: true, email: true } } },
    });
    return (0, response_1.successResponse)(res, 201, "Comment added", comment);
});
/* Add step */
exports.addStep = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await approval(req.params.id);
    if (!req.body.reviewerId)
        throw new AppError_1.AppError("reviewerId is required", 400);
    const maxStep = await prisma_1.default.approvalStep.aggregate({ where: { approvalId: req.params.id }, _max: { stepOrder: true } });
    const step = await prisma_1.default.approvalStep.create({
        data: {
            approvalId: req.params.id,
            stepOrder: (maxStep._max.stepOrder ?? 0) + 1,
            reviewerId: req.body.reviewerId,
        },
        include: { reviewer: { select: employeeSelect } },
    });
    return (0, response_1.successResponse)(res, 201, "Step added", step);
});
