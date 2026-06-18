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

  console.log("Default roles and departments seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });