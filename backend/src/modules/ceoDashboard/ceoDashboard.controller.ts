import prisma from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";
import bcrypt from "bcryptjs";

/* ─── CEO System Overview ─── */
export const ceoOverview = asyncHandler(async (req, res) => {
  const [
    totalUsers, activeUsers, totalRoles, totalDepartments, totalDesignations,
    totalEmployees, totalTeams,
    totalProjects, projectsByStatus,
    totalTasks, tasksByStatus,
    totalTickets, ticketsByStatus,
    totalClients, totalLeads, leadsByStatus,
    totalProposals, totalQuotations, totalContracts,
    totalAttendance,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.role.count(),
    prisma.department.count(),
    prisma.designation.count(),
    prisma.employee.count(),
    prisma.team.count(),
    prisma.project.count(),
    prisma.project.groupBy({ by: ["status"], _count: true }),
    prisma.task.count(),
    prisma.task.groupBy({ by: ["status"], _count: true }),
    prisma.ticket.count(),
    prisma.ticket.groupBy({ by: ["status"], _count: true }),
    prisma.client.count(),
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.commercialDocument.count({ where: { type: "PROPOSAL" } }),
    prisma.commercialDocument.count({ where: { type: "QUOTATION" } }),
    prisma.commercialDocument.count({ where: { type: "CONTRACT" } }),
    prisma.attendance.count({ where: { status: "PRESENT" } }),
  ]);

  return successResponse(res, 200, "CEO overview", {
    organization: { totalUsers, activeUsers, totalRoles, totalDepartments, totalDesignations, totalEmployees, totalTeams },
    projects: { total: totalProjects, byStatus: projectsByStatus },
    tasks: { total: totalTasks, byStatus: tasksByStatus },
    tickets: { total: totalTickets, byStatus: ticketsByStatus },
    crm: { totalClients, totalLeads, leadsByStatus },
    commercial: { totalProposals, totalQuotations, totalContracts },
    attendance: { presentToday: totalAttendance },
  });
});

/* ─── Recent Activity ─── */
export const ceoRecentActivity = asyncHandler(async (req, res) => {
  const [recentUsers, recentProjects, recentTickets, recentTasks, recentLeads, recentClients] = await Promise.all([
    prisma.user.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, createdAt: true } }),
    prisma.project.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, name: true, status: true, createdAt: true } }),
    prisma.ticket.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, title: true, status: true, priority: true, createdAt: true } }),
    prisma.task.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, title: true, status: true, priority: true, createdAt: true } }),
    prisma.lead.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, companyName: true, status: true, createdAt: true } }),
    prisma.client.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, name: true, status: true, createdAt: true } }),
  ]);

  return successResponse(res, 200, "Recent activity", {
    recentUsers, recentProjects, recentTickets, recentTasks, recentLeads, recentClients,
  });
});

/* ─── Quick Actions ─── */
export const ceoCreateEmployee = asyncHandler(async (req, res) => {
  const { name, email, password, phone, roleId, designationId, departmentId, joiningDate, salary } = req.body;
  if (!name || !email || !password) throw new AppError("name, email, and password are required", 400);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("Email already in use", 409);

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name, email, phone: phone || null,
      password: hashed,
      roleId: roleId || (await prisma.role.findFirst({ where: { name: "EMPLOYEE" } }))?.id || "",
    },
  });

  const code = `EMP${String(await prisma.employee.count() + 1).padStart(3, "0")}`;
  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      employeeCode: code,
      designationId: designationId || null,
      departmentId: departmentId || null,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      salary: salary ? Number(salary) : null,
    },
    include: { user: { select: { id: true, name: true, email: true } }, designation: true, department: true },
  });

  return successResponse(res, 201, "Employee created", employee);
});

export const ceoCreateProject = asyncHandler(async (req, res) => {
  const { name, clientId, managerId, startDate, endDate, budget, description } = req.body;
  if (!name || !clientId) throw new AppError("name and clientId are required", 400);

  const count = await prisma.project.count();
  const project = await prisma.project.create({
    data: {
      projectCode: `PRJ${String(count + 1).padStart(4, "0")}`,
      name, description: description || null,
      clientId, managerId: managerId || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budget: budget ? Number(budget) : null,
    },
    include: { client: { select: { id: true, name: true } }, manager: { select: { id: true, employeeCode: true, user: { select: { name: true } } } } },
  });

  return successResponse(res, 201, "Project created", project);
});

export const ceoCreateTask = asyncHandler(async (req, res) => {
  const { title, projectId, assignedToId, priority, dueDate, description } = req.body;
  if (!title || !projectId) throw new AppError("title and projectId are required", 400);

  const userId = (req as any).user?.id;
  const taskData: any = {
    title, description: description || null,
    projectId, assignedToId: assignedToId || null,
    priority: priority || "MEDIUM",
    dueDate: dueDate ? new Date(dueDate) : null,
  };
  if (userId) taskData.createdById = userId;
  const task = await prisma.task.create({
    data: taskData,
    include: { project: { select: { id: true, name: true } }, assignedTo: { select: { id: true, user: { select: { name: true } } } } },
  });

  return successResponse(res, 201, "Task created", task);
});

export const ceoCreateTicket = asyncHandler(async (req, res) => {
  const { title, description, clientId, projectId, priority, categoryId } = req.body;
  if (!title) throw new AppError("title is required", 400);

  const userId = (req as any).user?.id;
  const ticketData: any = {
    title, description: description || null,
    clientId: clientId || null,
    projectId: projectId || null,
    priority: priority || "MEDIUM",
    categoryId: categoryId || null,
  };
  if (userId) ticketData.createdById = userId;
  const ticket = await prisma.ticket.create({
    data: ticketData,
    include: { client: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
  });

  return successResponse(res, 201, "Ticket created", ticket);
});

/* ─── Create SUPER_ADMIN ─── */
export const ceoCreateSuperAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw new AppError("name, email, and password are required", 400);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("Email already in use", 409);

  const superAdminRole = await prisma.role.findFirst({ where: { name: "SUPER_ADMIN" } });
  if (!superAdminRole) throw new AppError("SUPER_ADMIN role not found. Run seed first.", 500);

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, roleId: superAdminRole.id },
    select: { id: true, name: true, email: true, role: { select: { name: true } }, createdAt: true },
  });

  return successResponse(res, 201, "Super Admin created", user);
});

/* ─── CEO Quick Stats — all modules ─── */
export const ceoModuleStats = asyncHandler(async (req, res) => {
  const [
    users, employees, projects, tasks, tickets,
    clients, leads, proposals, contracts,
    presentToday, onLeave, chats, meetings,
    payrolls, seoProjects, socialPosts, googleCampaigns, metaCampaigns,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.employee.count(),
    prisma.project.count(),
    prisma.task.count(),
    prisma.ticket.count(),
    prisma.client.count(),
    prisma.lead.count(),
    prisma.commercialDocument.count({ where: { type: "PROPOSAL" } }),
    prisma.commercialDocument.count({ where: { type: "CONTRACT" } }),
    prisma.attendance.count({ where: { status: "PRESENT", attendanceDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.leaveRequest.count({ where: { status: "APPROVED", startDate: { lte: new Date() }, endDate: { gte: new Date() } } }),
    prisma.chatRoom.count(),
    prisma.formalMeeting.count(),
    prisma.payroll.count(),
    prisma.seoProject.count(),
    prisma.socialPost.count(),
    prisma.googleAdsCampaign.count(),
    prisma.metaAdsCampaign.count(),
  ]);

  return successResponse(res, 200, "Module stats", {
    users, employees, projects, tasks, tickets,
    clients, leads, proposals, contracts,
    presentToday, onLeave, chats, meetings,
    payrolls, seoProjects, socialPosts, googleCampaigns, metaCampaigns,
  });
});
