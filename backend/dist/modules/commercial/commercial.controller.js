"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicPdf = exports.pdf = exports.publicDecision = exports.publicView = exports.convert = exports.send = exports.remove = exports.update = exports.create = exports.getOne = exports.list = exports.dashboard = void 0;
exports.writePdf = writePdf;
const crypto_1 = require("crypto");
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma_1 = __importDefault(require("../../config/prisma"));
const AppError_1 = require("../../utils/AppError");
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const include = { client: true, lead: true, items: { orderBy: { sortOrder: "asc" } }, approvalLogs: { orderBy: { createdAt: "desc" } } };
const typeMap = { proposals: "PROPOSAL", quotations: "QUOTATION", contracts: "CONTRACT", proposal: "PROPOSAL", quotation: "QUOTATION", contract: "CONTRACT" };
const getType = (value) => { const type = typeMap[value.toLowerCase()]; if (!type)
    throw new AppError_1.AppError("Invalid document type", 400); return type; };
const number = (type) => `${type.slice(0, 4)}-${new Date().getFullYear()}-${(0, crypto_1.randomBytes)(3).toString("hex").toUpperCase()}`;
const date = (value) => value ? new Date(String(value)) : null;
const text = (value) => String(value || "").trim() || null;
function totals(raw) {
    const input = Array.isArray(raw) ? raw : [];
    if (!input.length)
        throw new AppError_1.AppError("At least one line item is required", 400);
    const items = input.map((item, index) => {
        const quantity = Number(item.quantity || 0), unitPrice = Number(item.unitPrice || 0);
        if (!text(item.description) || quantity <= 0 || unitPrice < 0)
            throw new AppError_1.AppError("Line items require a description, positive quantity and valid price", 400);
        return { description: text(item.description), quantity, unitPrice, amount: quantity * unitPrice, sortOrder: index };
    });
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    return { items, subtotal };
}
function amounts(subtotal, discountValue, taxValue) {
    const discountAmount = Math.max(0, Number(discountValue || 0));
    const taxPercent = Math.max(0, Number(taxValue || 0));
    const taxable = Math.max(0, subtotal - discountAmount);
    const taxAmount = taxable * taxPercent / 100;
    return { subtotal, discountAmount, taxPercent, taxAmount, totalAmount: taxable + taxAmount };
}
async function find(id, type) {
    const document = await prisma_1.default.commercialDocument.findFirst({ where: { id, type }, include });
    if (!document)
        throw new AppError_1.AppError("Commercial document not found", 404);
    return document;
}
exports.dashboard = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const [total, draft, sent, accepted, value] = await Promise.all([
        prisma_1.default.commercialDocument.count(), prisma_1.default.commercialDocument.count({ where: { status: "DRAFT" } }), prisma_1.default.commercialDocument.count({ where: { status: { in: ["SENT", "VIEWED"] } } }), prisma_1.default.commercialDocument.count({ where: { status: "ACCEPTED" } }), prisma_1.default.commercialDocument.aggregate({ where: { status: "ACCEPTED" }, _sum: { totalAmount: true } })
    ]);
    return (0, response_1.successResponse)(res, 200, "Commercial dashboard fetched", { total, draft, sent, accepted, acceptedValue: value._sum.totalAmount || 0 });
});
exports.list = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const type = getType(req.params.type);
    const documents = await prisma_1.default.commercialDocument.findMany({ where: { type, status: req.query.status }, include, orderBy: { createdAt: "desc" } });
    return (0, response_1.successResponse)(res, 200, `${type} documents fetched`, documents);
});
exports.getOne = (0, asyncHandler_1.asyncHandler)(async (req, res) => (0, response_1.successResponse)(res, 200, "Document fetched", await find(req.params.id, getType(req.params.type))));
exports.create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const type = getType(req.params.type);
    const calculated = totals(req.body.items);
    const money = amounts(calculated.subtotal, req.body.discountAmount, req.body.taxPercent);
    if (!text(req.body.title))
        throw new AppError_1.AppError("Title is required", 400);
    if (!req.body.clientId && !req.body.leadId)
        throw new AppError_1.AppError("Select a client or lead", 400);
    const user = req.user;
    const document = await prisma_1.default.commercialDocument.create({ data: {
            type, documentNumber: number(type), title: text(req.body.title), currency: text(req.body.currency) || "INR", issueDate: date(req.body.issueDate) || new Date(), validUntil: date(req.body.validUntil), startDate: date(req.body.startDate), endDate: date(req.body.endDate), scope: text(req.body.scope), terms: text(req.body.terms), notes: text(req.body.notes), clientId: req.body.clientId || null, leadId: req.body.leadId || null, createdById: user?.id || null, ...money,
            items: { create: calculated.items }, approvalLogs: { create: { action: "CREATED", actorName: user?.name, actorEmail: user?.email } }
        }, include });
    return (0, response_1.successResponse)(res, 201, `${type} created`, document);
});
exports.update = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const type = getType(req.params.type);
    const existing = await find(req.params.id, type);
    if (["ACCEPTED", "CANCELLED"].includes(existing.status))
        throw new AppError_1.AppError("Finalized documents cannot be edited", 409);
    const calculated = req.body.items ? totals(req.body.items) : { items: existing.items.map(({ description, quantity, unitPrice, amount, sortOrder }) => ({ description, quantity, unitPrice, amount, sortOrder })), subtotal: existing.subtotal };
    const money = amounts(calculated.subtotal, req.body.discountAmount ?? existing.discountAmount, req.body.taxPercent ?? existing.taxPercent);
    const document = await prisma_1.default.$transaction(async (tx) => { await tx.commercialDocumentItem.deleteMany({ where: { documentId: existing.id } }); return tx.commercialDocument.update({ where: { id: existing.id }, data: { title: text(req.body.title) || existing.title, validUntil: req.body.validUntil === undefined ? existing.validUntil : date(req.body.validUntil), startDate: req.body.startDate === undefined ? existing.startDate : date(req.body.startDate), endDate: req.body.endDate === undefined ? existing.endDate : date(req.body.endDate), scope: req.body.scope === undefined ? existing.scope : text(req.body.scope), terms: req.body.terms === undefined ? existing.terms : text(req.body.terms), notes: req.body.notes === undefined ? existing.notes : text(req.body.notes), ...money, items: { create: calculated.items }, approvalLogs: { create: { action: "UPDATED", actorName: req.user?.name } } }, include }); });
    return (0, response_1.successResponse)(res, 200, `${type} updated`, document);
});
exports.remove = (0, asyncHandler_1.asyncHandler)(async (req, res) => { const document = await find(req.params.id, getType(req.params.type)); if (document.status !== "DRAFT")
    throw new AppError_1.AppError("Only draft documents can be deleted", 409); await prisma_1.default.commercialDocument.delete({ where: { id: document.id } }); return (0, response_1.successResponse)(res, 200, "Document deleted"); });
exports.send = (0, asyncHandler_1.asyncHandler)(async (req, res) => { const document = await find(req.params.id, getType(req.params.type)); const updated = await prisma_1.default.commercialDocument.update({ where: { id: document.id }, data: { status: "SENT", sentAt: new Date(), approvalLogs: { create: { action: "SENT", actorName: req.user?.name } } }, include }); const base = process.env.FRONTEND_URL || "http://localhost:5173"; return (0, response_1.successResponse)(res, 200, "Document sent for client approval", { document: updated, acceptanceUrl: `${base}/review/${document.type.toLowerCase()}/${document.publicToken}` }); });
exports.convert = (0, asyncHandler_1.asyncHandler)(async (req, res) => { const source = await find(req.params.id, getType(req.params.type)); const target = source.type === "PROPOSAL" ? "QUOTATION" : source.type === "QUOTATION" ? "CONTRACT" : null; if (!target)
    throw new AppError_1.AppError("Contracts cannot be converted further", 400); const created = await prisma_1.default.commercialDocument.create({ data: { type: target, documentNumber: number(target), title: source.title, currency: source.currency, validUntil: source.validUntil, startDate: source.startDate, endDate: source.endDate, scope: source.scope, terms: source.terms, notes: `Converted from ${source.documentNumber}`, subtotal: source.subtotal, discountAmount: source.discountAmount, taxPercent: source.taxPercent, taxAmount: source.taxAmount, totalAmount: source.totalAmount, clientId: source.clientId, leadId: source.leadId, createdById: req.user?.id, items: { create: source.items.map(({ description, quantity, unitPrice, amount, sortOrder }) => ({ description, quantity, unitPrice, amount, sortOrder })) }, approvalLogs: { create: { action: "CREATED", comments: `Converted from ${source.documentNumber}` } } }, include }); return (0, response_1.successResponse)(res, 201, `${target} generated`, created); });
exports.publicView = (0, asyncHandler_1.asyncHandler)(async (req, res) => { const type = getType(req.params.type); const document = await prisma_1.default.commercialDocument.findFirst({ where: { publicToken: req.params.token, type }, include }); if (!document)
    throw new AppError_1.AppError("Document not found", 404); if (document.status === "SENT")
    await prisma_1.default.commercialDocument.update({ where: { id: document.id }, data: { status: "VIEWED", viewedAt: new Date(), approvalLogs: { create: { action: "VIEWED", ipAddress: req.ip } } } }); return (0, response_1.successResponse)(res, 200, "Document fetched", document); });
exports.publicDecision = (0, asyncHandler_1.asyncHandler)(async (req, res) => { const type = getType(req.params.type); const document = await prisma_1.default.commercialDocument.findFirst({ where: { publicToken: req.params.token, type } }); if (!document)
    throw new AppError_1.AppError("Document not found", 404); if (!text(req.body.name) || !text(req.body.email))
    throw new AppError_1.AppError("Name and email are required", 400); const accept = String(req.body.decision).toUpperCase() === "ACCEPT"; const reject = String(req.body.decision).toUpperCase() === "REJECT"; if (!accept && !reject)
    throw new AppError_1.AppError("Decision must be ACCEPT or REJECT", 400); const status = accept ? "ACCEPTED" : "REJECTED"; const action = accept ? "ACCEPTED" : "REJECTED"; const updated = await prisma_1.default.commercialDocument.update({ where: { id: document.id }, data: { status, acceptedAt: accept ? new Date() : null, rejectedAt: reject ? new Date() : null, acceptedByName: text(req.body.name), acceptedByEmail: text(req.body.email), approvalLogs: { create: { action, actorName: text(req.body.name), actorEmail: text(req.body.email), comments: text(req.body.comments), ipAddress: req.ip } } }, include }); return (0, response_1.successResponse)(res, 200, `Document ${status.toLowerCase()}`, updated); });
function writePdf(res, document) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${document.documentNumber}.pdf"`);
    const pdf = new pdfkit_1.default({ size: "A4", margin: 48 });
    pdf.pipe(res);
    pdf.rect(0, 0, 595, 118).fill("#0f3d36");
    pdf.fillColor("white").fontSize(11).text("ADSCALE ONE ERP", 48, 42).fontSize(26).text(document.type, 48, 62);
    pdf.fillColor("#0f172a").fontSize(18).text(document.title, 48, 145);
    pdf.fontSize(10).fillColor("#64748b").text(`${document.documentNumber}  |  Issued ${document.issueDate.toLocaleDateString("en-IN")}`, 48, 174);
    const party = document.client?.name || document.lead?.companyName || "Client";
    pdf.fillColor("#0f172a").fontSize(11).text(`Prepared for: ${party}`, 48, 205).text(`Status: ${document.status}`, 350, 205);
    let y = 245;
    pdf.fillColor("#e2e8f0").rect(48, y, 499, 28).fill();
    pdf.fillColor("#0f172a").fontSize(9).text("DESCRIPTION", 58, y + 10).text("QTY", 350, y + 10).text("RATE", 405, y + 10).text("AMOUNT", 475, y + 10);
    y += 36;
    for (const item of document.items) {
        if (y > 680) {
            pdf.addPage();
            y = 60;
        }
        pdf.text(item.description, 58, y, { width: 270 }).text(String(item.quantity), 350, y).text(item.unitPrice.toLocaleString("en-IN"), 405, y).text(item.amount.toLocaleString("en-IN"), 475, y);
        y += 28;
    }
    y += 10;
    pdf.moveTo(330, y).lineTo(547, y).stroke("#cbd5e1");
    y += 12;
    pdf.text("Subtotal", 350, y).text(document.subtotal.toLocaleString("en-IN"), 475, y);
    y += 18;
    pdf.text(`Tax (${document.taxPercent}%)`, 350, y).text(document.taxAmount.toLocaleString("en-IN"), 475, y);
    y += 18;
    pdf.fontSize(13).text(`Total ${document.currency}`, 350, y).text(document.totalAmount.toLocaleString("en-IN"), 475, y);
    if (document.scope) {
        y += 50;
        pdf.fontSize(12).text("Scope / Deliverables", 48, y);
        y += 20;
        pdf.fontSize(9).fillColor("#475569").text(document.scope, 48, y, { width: 499 });
        y = pdf.y + 20;
    }
    if (document.terms) {
        pdf.fillColor("#0f172a").fontSize(12).text("Terms", 48, y);
        pdf.fontSize(9).fillColor("#475569").text(document.terms, 48, y + 20, { width: 499 });
    }
    pdf.fontSize(8).fillColor("#64748b").text("Generated securely by AdScale One ERP", 48, 790, { align: "center", width: 499 });
    pdf.end();
}
exports.pdf = (0, asyncHandler_1.asyncHandler)(async (req, res) => { writePdf(res, await find(req.params.id, getType(req.params.type))); });
exports.publicPdf = (0, asyncHandler_1.asyncHandler)(async (req, res) => { const document = await prisma_1.default.commercialDocument.findFirst({ where: { publicToken: req.params.token, type: getType(req.params.type) }, include }); if (!document)
    throw new AppError_1.AppError("Document not found", 404); writePdf(res, document); });
