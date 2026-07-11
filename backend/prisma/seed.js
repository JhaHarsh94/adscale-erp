const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const roles = [
    {
      name: "SUPER_ADMIN",
      description: "Full system access with complete control",
    },
    {
      name: "DIRECTOR",
      description: "Company dashboard, reports, finance and management overview",
    },
    {
      name: "OPERATIONS_MANAGER",
      description: "Projects, teams, tickets, approvals and operations control",
    },
    {
      name: "HR",
      description: "Employees, attendance, leave, recruitment and HR operations",
    },
    {
      name: "SALES_MANAGER",
      description: "Leads, CRM, proposals, follow-ups and client acquisition",
    },
    {
      name: "TEAM_LEAD",
      description: "Tasks, tickets, approvals, team worklogs and team monitoring",
    },
    {
      name: "EMPLOYEE",
      description: "Assigned tasks, attendance, leave and daily work updates",
    },
    {
      name: "FREELANCER",
      description: "Limited access to assigned work only",
    },
    {
      name: "CLIENT",
      description: "Client portal access only",
    },
  ];

  const departments = [
    {
      name: "Management",
      description: "Company leadership and decision making",
    },
    {
      name: "Sales",
      description: "Lead generation, follow-ups and client acquisition",
    },
    {
      name: "HR",
      description: "Human resources and employee management",
    },
    {
      name: "Accounts",
      description: "Billing, payments, payroll and finance records",
    },
    {
      name: "Operations",
      description: "Project operations, delivery and team coordination",
    },
    {
      name: "SEO Team",
      description: "SEO projects, ranking, backlinks and reports",
    },
    {
      name: "Social Media Team",
      description: "Content calendar, social posts and creative planning",
    },
    {
      name: "Design Team",
      description: "Graphics, branding, creatives and UI design",
    },
    {
      name: "Development Team",
      description: "Websites, apps, portals and technical implementation",
    },
    {
      name: "Video Editing Team",
      description: "Video editing, reels, ads and production work",
    },
    {
      name: "Client",
      description: "External client users and client portal access",
    },
  ];

  const permissionModules = [
    "USERS",
    "ROLES",
    "PERMISSIONS",
    "DEPARTMENTS",
    "TEAMS",
    "DESIGNATIONS",
    "EMPLOYEES",
    "ATTENDANCE",
    "LEAVES",
    "CRM",
    "COMMERCIAL",
    "PROJECTS",
    "TICKETS",
    "RECRUITMENT",
  ];
  const standardActions = ["VIEW", "CREATE", "UPDATE", "DELETE"];
  const permissions = permissionModules.flatMap((module) =>
    standardActions.map((action) => ({
      name: `${module}_${action}`,
      module,
      action,
      description: `${action.toLowerCase()} access for ${module.toLowerCase()}`,
    }))
  );
  permissions.push(
    {
      name: "ATTENDANCE_APPROVE",
      module: "ATTENDANCE",
      action: "APPROVE",
      description: "Approve attendance correction requests",
    },
    {
      name: "LEAVES_APPROVE",
      module: "LEAVES",
      action: "APPROVE",
      description: "Approve or reject leave requests",
    }
  );

  const rolePermissionRules = {
    SUPER_ADMIN: () => true,
    DIRECTOR: () => true,
    OPERATIONS_MANAGER: (permission) =>
      ["DEPARTMENTS", "TEAMS", "DESIGNATIONS", "EMPLOYEES", "ATTENDANCE", "LEAVES", "CRM", "COMMERCIAL", "PROJECTS", "TICKETS", "RECRUITMENT"].includes(permission.module),
    HR: (permission) =>
      ["DEPARTMENTS", "TEAMS", "DESIGNATIONS", "EMPLOYEES", "ATTENDANCE", "LEAVES", "RECRUITMENT"].includes(permission.module),
    SALES_MANAGER: (permission) =>
      ["CRM", "COMMERCIAL"].includes(permission.module) ||
      (permission.module === "EMPLOYEES" && permission.action === "VIEW"),
    TEAM_LEAD: (permission) =>
      (["EMPLOYEES", "ATTENDANCE", "LEAVES", "CRM", "TICKETS"].includes(permission.module) &&
        !["DELETE"].includes(permission.action)),
    EMPLOYEE: (permission) =>
      ["ATTENDANCE", "LEAVES", "TICKETS"].includes(permission.module) &&
      ["VIEW", "CREATE"].includes(permission.action),
    FREELANCER: (permission) =>
      ["ATTENDANCE", "LEAVES"].includes(permission.module) &&
      permission.action === "VIEW",
    CLIENT: () => false,
  };

  console.log("Seeding roles...");

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
      },
      create: role,
    });
  }

  console.log("Seeding departments...");

  for (const department of departments) {
    await prisma.department.upsert({
      where: { name: department.name },
      update: {
        description: department.description,
      },
      create: department,
    });
  }

  console.log("Seeding permissions...");

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {
        module: permission.module,
        action: permission.action,
        description: permission.description,
      },
      create: permission,
    });
  }

  const savedRoles = await prisma.role.findMany();
  const savedPermissions = await prisma.permission.findMany();

  for (const role of savedRoles) {
    const rule = rolePermissionRules[role.name] || (() => false);
    const permissionIds = savedPermissions.filter(rule).map((item) => item.id);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissionIds.length) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }
  }

  console.log("Default roles, permissions and departments seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
