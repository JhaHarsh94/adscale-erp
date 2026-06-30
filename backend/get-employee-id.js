$code = (
'const { PrismaClient } = require("@prisma/client");',
'const prisma = new PrismaClient();',
'async function main() {',
'  const employee = await prisma.employee.findFirst({',
'    where: { employeeCode: "ADS-EMP-001" },',
'    include: { user: true }',
'  });',
'  if (!employee) {',
'    console.log("");',
'    return;',
'  }',
'  console.log(employee.id);',
'}',
'main().catch(console.error).finally(async () => {',
'  await prisma.$disconnect();',
'});'
)

