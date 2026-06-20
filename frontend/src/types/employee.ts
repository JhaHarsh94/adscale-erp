export interface EmployeeUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  role?: {
    id: string;
    name: string;
  };
}

export interface Department {
  id: string;
  name: string;
}

export interface Designation {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  joiningDate?: string | null;
  salary?: number | null;
  skills?: string | null;
  employmentStatus: string;
  user: EmployeeUser;
  department?: Department | null;
  designation?: Designation | null;
  manager?: Employee | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDocument {
  id: string;
  type: string;
  name: string;
  fileUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface EmployeeSkill {
  id: string;
  skillName: string;
  level: string;
  yearsOfExperience?: number | null;
  notes?: string | null;
}

export interface EmployeeSalaryDetail {
  id: string;
  basicSalary: number;
  hra: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  effectiveFrom: string;
  isCurrent: boolean;
}

export interface EmployeeProfile extends Employee {
  documents: EmployeeDocument[];
  employeeSkills: EmployeeSkill[];
  salaryDetails: EmployeeSalaryDetail[];
}