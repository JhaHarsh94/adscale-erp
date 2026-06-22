import type { Employee } from "./employee";

export interface DepartmentRecord {
  id: string;
  name: string;
  description?: string | null;
  employees?: Employee[];
  designations?: DesignationRecord[];
  teams?: TeamRecord[];
  _count?: {
    employees: number;
  };
}

export interface DesignationRecord {
  id: string;
  name: string;
  description?: string | null;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    employees: number;
  };
}

export interface TeamMemberRecord {
  id?: string;
  teamId?: string;
  employeeId: string;
  role: string;
  employee?: Employee;
}

export interface TeamRecord {
  id: string;
  name: string;
  description?: string | null;
  departmentId: string;
  department?: {
    id: string;
    name: string;
  };
  members?: TeamMemberRecord[];
}
