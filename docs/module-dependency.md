# AdScale One ERP — Module Dependency Map

## Foundation Modules

These modules must be built first:

1. Authentication
2. Roles
3. Permissions
4. Departments
5. Employees

## Dependent Modules

Attendance depends on:

- Users
- Employees
- Departments

Leave depends on:

- Users
- Employees
- HR
- Team Lead

CRM depends on:

- Users
- Sales Manager
- Clients

Projects depend on:

- Clients
- Employees
- Departments

Tasks depend on:

- Projects
- Employees
- Team Leads

Tickets depend on:

- Clients
- Projects
- Employees
- Team Leads

Approvals depend on:

- Tasks
- Projects
- Clients
- Team Leads
- Managers

Chat depends on:

- Users
- Departments
- Projects

Payroll depends on:

- Employees
- Attendance
- Leave
- Salary Structure

AI Layer depends on:

- Tickets
- Tasks
- Projects
- Work Logs
- Meetings
- Reports